package expressions

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// ExpressionResolver resolves n8n-style expressions in workflow parameters
// This runs in the Go orchestrator BEFORE routing to language-specific workers
type ExpressionResolver struct {
	workflowData map[string]interface{}
	nodeData     map[string]interface{}
	envVars      map[string]string
}

// NewExpressionResolver creates a new expression resolver
func NewExpressionResolver(workflowData, nodeData map[string]interface{}, envVars map[string]string) *ExpressionResolver {
	return &ExpressionResolver{
		workflowData: workflowData,
		nodeData:     nodeData,
		envVars:      envVars,
	}
}

// Resolve resolves all expressions in the given data structure
func (r *ExpressionResolver) Resolve(data interface{}) (interface{}, error) {
	return r.resolveValue(data)
}

func (r *ExpressionResolver) resolveValue(value interface{}) (interface{}, error) {
	switch v := value.(type) {
	case string:
		return r.resolveString(v)
	case map[string]interface{}:
		return r.resolveMap(v)
	case []interface{}:
		return r.resolveArray(v)
	default:
		return value, nil
	}
}

func (r *ExpressionResolver) resolveString(str string) (interface{}, error) {
	// Pattern: {{ expression }}
	pattern := regexp.MustCompile(`\{\{(.+?)\}\}`)
	
	// If the entire string is an expression, return the resolved value directly
	if matches := pattern.FindStringSubmatch(str); len(matches) == 2 && strings.TrimSpace(str) == strings.TrimSpace(matches[0]) {
		return r.evaluateExpression(strings.TrimSpace(matches[1]))
	}

	// Otherwise, replace all expressions in the string
	result := pattern.ReplaceAllStringFunc(str, func(match string) string {
		expr := pattern.FindStringSubmatch(match)[1]
		value, err := r.evaluateExpression(strings.TrimSpace(expr))
		if err != nil {
			return match // Keep original if error
		}
		return fmt.Sprintf("%v", value)
	})

	return result, nil
}

func (r *ExpressionResolver) resolveMap(m map[string]interface{}) (map[string]interface{}, error) {
	result := make(map[string]interface{})
	for key, value := range m {
		resolvedValue, err := r.resolveValue(value)
		if err != nil {
			return nil, err
		}
		result[key] = resolvedValue
	}
	return result, nil
}

func (r *ExpressionResolver) resolveArray(arr []interface{}) ([]interface{}, error) {
	result := make([]interface{}, len(arr))
	for i, value := range arr {
		resolvedValue, err := r.resolveValue(value)
		if err != nil {
			return nil, err
		}
		result[i] = resolvedValue
	}
	return result, nil
}

func (r *ExpressionResolver) evaluateExpression(expr string) (interface{}, error) {
	expr = strings.TrimSpace(expr)

	// $json - current node's JSON output
	if expr == "$json" {
		return r.nodeData, nil
	}

	// $json.field - access field in current node
	if strings.HasPrefix(expr, "$json.") {
		field := strings.TrimPrefix(expr, "$json.")
		return r.getNestedField(r.nodeData, field)
	}

	// $node("NodeName").json - access another node's output
	if strings.Contains(expr, "$node(") {
		return r.evaluateNodeReference(expr)
	}

	// $env.VARIABLE - environment variable
	if strings.HasPrefix(expr, "$env.") {
		varName := strings.TrimPrefix(expr, "$env.")
		if val, ok := r.envVars[varName]; ok {
			return val, nil
		}
		return nil, fmt.Errorf("environment variable not found: %s", varName)
	}

	// $now - current timestamp
	if expr == "$now" {
		return time.Now().Format(time.RFC3339), nil
	}

	// $today - today's date
	if expr == "$today" {
		return time.Now().Format("2006-01-02"), nil
	}

	// String literals
	if strings.HasPrefix(expr, "'") && strings.HasSuffix(expr, "'") {
		return strings.Trim(expr, "'"), nil
	}
	if strings.HasPrefix(expr, "\"") && strings.HasSuffix(expr, "\"") {
		return strings.Trim(expr, "\""), nil
	}

	// Number literals
	if num, err := strconv.ParseFloat(expr, 64); err == nil {
		return num, nil
	}

	// Boolean literals
	if expr == "true" {
		return true, nil
	}
	if expr == "false" {
		return false, nil
	}

	// null/nil
	if expr == "null" || expr == "nil" {
		return nil, nil
	}

	return nil, fmt.Errorf("unsupported expression: %s", expr)
}

func (r *ExpressionResolver) evaluateNodeReference(expr string) (interface{}, error) {
	// Pattern: $node("NodeName").json or $node("NodeName").json.field
	pattern := regexp.MustCompile(`\$node\("(.+?)"\)\.(.+)`)
	matches := pattern.FindStringSubmatch(expr)
	
	if len(matches) != 3 {
		return nil, fmt.Errorf("invalid node reference: %s", expr)
	}

	nodeName := matches[1]
	path := matches[2]

	// Get node data from workflow data
	nodeKey := fmt.Sprintf("node_%s", nodeName)
	nodeOutput, ok := r.workflowData[nodeKey]
	if !ok {
		return nil, fmt.Errorf("node not found: %s", nodeName)
	}

	// If path is just "json", return the entire output
	if path == "json" {
		return nodeOutput, nil
	}

	// Otherwise, navigate the path
	if strings.HasPrefix(path, "json.") {
		field := strings.TrimPrefix(path, "json.")
		nodeMap, ok := nodeOutput.(map[string]interface{})
		if !ok {
			return nil, fmt.Errorf("node output is not a map: %s", nodeName)
		}
		return r.getNestedField(nodeMap, field)
	}

	return nil, fmt.Errorf("invalid node path: %s", path)
}

func (r *ExpressionResolver) getNestedField(data interface{}, path string) (interface{}, error) {
	parts := strings.Split(path, ".")
	current := data

	for _, part := range parts {
		// Handle array indices: field[0]
		if strings.Contains(part, "[") {
			return r.handleArrayAccess(current, part)
		}

		switch v := current.(type) {
		case map[string]interface{}:
			val, ok := v[part]
			if !ok {
				return nil, fmt.Errorf("field not found: %s", part)
			}
			current = val
		default:
			return nil, fmt.Errorf("cannot access field %s on non-object", part)
		}
	}

	return current, nil
}

func (r *ExpressionResolver) handleArrayAccess(data interface{}, part string) (interface{}, error) {
	// Pattern: field[index]
	pattern := regexp.MustCompile(`(.+?)\[(\d+)\]`)
	matches := pattern.FindStringSubmatch(part)
	
	if len(matches) != 3 {
		return nil, fmt.Errorf("invalid array access: %s", part)
	}

	field := matches[1]
	index, _ := strconv.Atoi(matches[2])

	// Get the field
	var arr []interface{}
	if field != "" {
		m, ok := data.(map[string]interface{})
		if !ok {
			return nil, fmt.Errorf("cannot access field on non-object")
		}
		arrVal, ok := m[field]
		if !ok {
			return nil, fmt.Errorf("field not found: %s", field)
		}
		arr, ok = arrVal.([]interface{})
		if !ok {
			return nil, fmt.Errorf("field is not an array: %s", field)
		}
	} else {
		var ok bool
		arr, ok = data.([]interface{})
		if !ok {
			return nil, fmt.Errorf("data is not an array")
		}
	}

	if index < 0 || index >= len(arr) {
		return nil, fmt.Errorf("array index out of bounds: %d", index)
	}

	return arr[index], nil
}

// ResolveJSON is a helper to resolve expressions in JSON data
func ResolveJSON(jsonData string, workflowData, nodeData map[string]interface{}, envVars map[string]string) (string, error) {
	var data interface{}
	if err := json.Unmarshal([]byte(jsonData), &data); err != nil {
		return "", err
	}

	resolver := NewExpressionResolver(workflowData, nodeData, envVars)
	resolved, err := resolver.Resolve(data)
	if err != nil {
		return "", err
	}

	result, err := json.Marshal(resolved)
	if err != nil {
		return "", err
	}

	return string(result), nil
}
