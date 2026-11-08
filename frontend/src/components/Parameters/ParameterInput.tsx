import React, { useState, useMemo, useEffect } from 'react';
import { Settings, Info, AlertCircle, ToggleLeft, ChevronDown } from 'lucide-react';

export interface NodeProperty {
    name: string;
    displayName: string;
    type: 'string' | 'number' | 'boolean' | 'options' | 'collection' | 'fixedCollection' | 'dateTime' | 'json';
    default: any;
    description?: string;
    options?: Array<{ name: string; value: any; description?: string }>;
    typeOptions?: {
        password?: boolean;
        rows?: number;
        minValue?: number;
        maxValue?: number;
        multipleValues?: boolean;
    };
}

interface ParameterInputProps {
    property: NodeProperty;
    value: any;
    onChange: (value: any) => void;
    onExpressionToggle?: (isExpression: boolean) => void;
    evaluatedValue?: any;
}

export const ParameterInput: React.FC<ParameterInputProps> = ({
    property,
    value,
    onChange,
    evaluatedValue,
}) => {
    const [isExpression, setIsExpression] = useState(
        typeof value === 'string' && value.startsWith('=')
    );

    const [isFocused, setIsFocused] = useState(false);

    // n8n logic: Check if the value is an expression
    useEffect(() => {
        setIsExpression(typeof value === 'string' && value.startsWith('='));
    }, [value]);

    const handleToggleExpression = () => {
        const newIsExpression = !isExpression;
        setIsExpression(newIsExpression);

        if (newIsExpression) {
            // n8n logic: Add '=' prefix if turning into expression
            if (typeof value !== 'string' || !value.startsWith('=')) {
                onChange(`=${value || ''}`);
            }
        } else {
            // n8n logic: Remove '=' prefix if turning back to fixed
            if (typeof value === 'string' && value.startsWith('=')) {
                onChange(value.slice(1));
            }
        }
    };

    const renderInput = () => {
        if (isExpression) {
            return (
                <div className="relative group">
                    <textarea
                        className="w-full bg-slate-900 text-purple-300 font-mono text-xs p-2 rounded border border-purple-500/30 focus:border-purple-500 outline-none min-height-[60px]"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="={{ $json.fieldName }}"
                        rows={2}
                    />
                    {evaluatedValue !== undefined && (
                        <div className="mt-1 text-[10px] text-slate-400 italic flex items-center gap-1">
                            <Info size={10} />
                            Result: {JSON.stringify(evaluatedValue)}
                        </div>
                    )}
                </div>
            );
        }

        switch (property.type) {
            case 'boolean':
                return (
                    <div
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${value ? 'bg-purple-600' : 'bg-slate-700'}`}
                        onClick={() => onChange(!value)}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                    </div>
                );

            case 'options':
                return (
                    <div className="relative">
                        <select
                            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm p-2 rounded appearance-none focus:border-purple-500 outline-none"
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                        >
                            {property.options?.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-2.5 text-slate-500 pointer-events-none" size={16} />
                    </div>
                );

            case 'number':
                return (
                    <input
                        type="number"
                        className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm p-2 rounded focus:border-purple-500 outline-none"
                        value={value}
                        onChange={(e) => onChange(parseFloat(e.target.value))}
                        min={property.typeOptions?.minValue}
                        max={property.typeOptions?.maxValue}
                    />
                );

            default:
                return (
                    <input
                        type={property.typeOptions?.password ? 'password' : 'text'}
                        className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm p-2 rounded focus:border-purple-500 outline-none"
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={property.default}
                    />
                );
        }
    };

    return (
        <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                    {property.displayName}
                    {property.description && (
                        <div className="group relative">
                            <Info size={12} className="cursor-help text-slate-600" />
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-slate-900 border border-slate-700 rounded text-[10px] text-slate-300 shadow-xl z-50">
                                {property.description}
                            </div>
                        </div>
                    )}
                </label>

                <button
                    onClick={handleToggleExpression}
                    className={`text-[10px] px-1.5 py-0.5 rounded border transition-all ${isExpression
                            ? 'bg-purple-500/20 border-purple-500/50 text-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.2)]'
                            : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
                        }`}
                >
                    Expression
                </button>
            </div>

            <div className="relative">
                {renderInput()}
            </div>
        </div>
    );
};
