"""
Machine Learning Activities for Temporal Workflows

This module provides ML activities including model training, prediction,
evaluation, and data preprocessing.
"""

import json
import logging
import tempfile
import pickle
from typing import Dict, Any, List, Optional
from datetime import datetime

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.svm import SVC, SVR
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder, MinMaxScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, mean_squared_error, r2_score
import joblib

from temporalio import activity

logger = logging.getLogger(__name__)

@activity.defn(name="train_model")
async def train_model(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Train a machine learning model.
    
    Args:
        params: Dictionary containing:
            - data: Training data (list of records or CSV string)
            - target_column: Name of target column
            - model_type: Type of model (random_forest, logistic_regression, svm, etc.)
            - model_params: Model hyperparameters
            - test_size: Train-test split ratio (default: 0.2)
            - random_state: Random seed for reproducibility
    
    Returns:
        Dictionary with training results and model metadata
    """
    logger.info(f"Training {params.get('model_type', 'unknown')} model")
    
    try:
        # Prepare data
        if isinstance(params['data'], str):
            # Assume CSV format
            from io import StringIO
            df = pd.read_csv(StringIO(params['data']))
        else:
            df = pd.DataFrame(params['data'])
        
        target_column = params['target_column']
        X = df.drop(columns=[target_column])
        y = df[target_column]
        
        # Handle categorical variables
        categorical_columns = X.select_dtypes(include=['object']).columns
        for col in categorical_columns:
            le = LabelEncoder()
            X[col] = le.fit_transform(X[col].astype(str))
        
        # Split data
        test_size = params.get('test_size', 0.2)
        random_state = params.get('random_state', 42)
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state
        )
        
        # Feature scaling
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Initialize model
        model_type = params['model_type']
        model_params = params.get('model_params', {})
        
        if model_type == 'random_forest':
            # Determine if classification or regression
            if len(np.unique(y)) < 20:  # Assume classification
                model = RandomForestClassifier(random_state=random_state, **model_params)
            else:
                model = RandomForestRegressor(random_state=random_state, **model_params)
        elif model_type == 'logistic_regression':
            model = LogisticRegression(random_state=random_state, **model_params)
        elif model_type == 'linear_regression':
            model = LinearRegression(**model_params)
        elif model_type == 'svm':
            if len(np.unique(y)) < 20:
                model = SVC(random_state=random_state, **model_params)
            else:
                model = SVR(**model_params)
        else:
            raise ValueError(f"Unsupported model type: {model_type}")
        
        # Train model
        if model_type in ['svm', 'logistic_regression']:
            model.fit(X_train_scaled, y_train)
            y_pred = model.predict(X_test_scaled)
        else:
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)
        
        # Evaluate model
        if len(np.unique(y)) < 20:  # Classification
            accuracy = accuracy_score(y_test, y_pred)
            precision = precision_score(y_test, y_pred, average='weighted')
            recall = recall_score(y_test, y_pred, average='weighted')
            f1 = f1_score(y_test, y_pred, average='weighted')
            
            metrics = {
                'accuracy': float(accuracy),
                'precision': float(precision),
                'recall': float(recall),
                'f1_score': float(f1)
            }
        else:  # Regression
            mse = mean_squared_error(y_test, y_pred)
            r2 = r2_score(y_test, y_pred)
            rmse = np.sqrt(mse)
            
            metrics = {
                'mse': float(mse),
                'rmse': float(rmse),
                'r2_score': float(r2)
            }
        
        # Save model
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pkl') as f:
            model_data = {
                'model': model,
                'scaler': scaler if model_type in ['svm', 'logistic_regression'] else None,
                'feature_names': list(X.columns),
                'target_column': target_column,
                'model_type': model_type,
                'categorical_columns': list(categorical_columns),
                'label_encoders': {col: LabelEncoder().fit(df[col].astype(str)) for col in categorical_columns}
            }
            joblib.dump(model_data, f.name)
            model_path = f.name
        
        result = {
            'success': True,
            'model_path': model_path,
            'model_type': model_type,
            'metrics': metrics,
            'feature_count': len(X.columns),
            'training_samples': len(X_train),
            'test_samples': len(X_test),
            'trained_at': datetime.now().isoformat()
        }
        
        logger.info(f"Model training completed successfully: {metrics}")
        return result
        
    except Exception as e:
        logger.error(f"Model training failed: {e}")
        return {
            'success': False,
            'error': str(e),
            'model_type': params.get('model_type', 'unknown')
        }

@activity.defn(name="predict")
async def predict(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Make predictions using a trained model.
    
    Args:
        params: Dictionary containing:
            - model_path: Path to saved model
            - data: Data to predict on
            - return_probabilities: Whether to return prediction probabilities
    
    Returns:
        Dictionary with predictions and metadata
    """
    logger.info("Making predictions with trained model")
    
    try:
        # Load model
        model_data = joblib.load(params['model_path'])
        model = model_data['model']
        scaler = model_data.get('scaler')
        feature_names = model_data['feature_names']
        categorical_columns = model_data.get('categorical_columns', [])
        label_encoders = model_data.get('label_encoders', {})
        
        # Prepare data
        if isinstance(params['data'], str):
            from io import StringIO
            df = pd.read_csv(StringIO(params['data']))
        else:
            df = pd.DataFrame(params['data'])
        
        # Ensure all required features are present
        missing_features = set(feature_names) - set(df.columns)
        if missing_features:
            raise ValueError(f"Missing features: {missing_features}")
        
        X = df[feature_names]
        
        # Handle categorical variables
        for col in categorical_columns:
            if col in X.columns and col in label_encoders:
                le = label_encoders[col]
                X[col] = le.transform(X[col].astype(str))
        
        # Apply scaling if needed
        if scaler is not None:
            X_scaled = scaler.transform(X)
            predictions = model.predict(X_scaled)
            
            # Get probabilities for classification
            if hasattr(model, 'predict_proba') and params.get('return_probabilities', False):
                probabilities = model.predict_proba(X_scaled)
            else:
                probabilities = None
        else:
            predictions = model.predict(X)
            
            if hasattr(model, 'predict_proba') and params.get('return_probabilities', False):
                probabilities = model.predict_proba(X)
            else:
                probabilities = None
        
        result = {
            'success': True,
            'predictions': predictions.tolist(),
            'sample_count': len(predictions),
            'model_type': model_data['model_type'],
            'predicted_at': datetime.now().isoformat()
        }
        
        if probabilities is not None:
            result['probabilities'] = probabilities.tolist()
            result['classes'] = model.classes_.tolist()
        
        logger.info(f"Predictions completed for {len(predictions)} samples")
        return result
        
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        return {
            'success': False,
            'error': str(e),
            'model_path': params.get('model_path', 'unknown')
        }

@activity.defn(name="evaluate_model")
async def evaluate_model(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evaluate a trained model on test data.
    
    Args:
        params: Dictionary containing:
            - model_path: Path to saved model
            - test_data: Test data
            - target_column: Name of target column
    
    Returns:
        Dictionary with evaluation metrics
    """
    logger.info("Evaluating model performance")
    
    try:
        # Load model
        model_data = joblib.load(params['model_path'])
        model = model_data['model']
        scaler = model_data.get('scaler')
        feature_names = model_data['feature_names']
        target_column = params['target_column']
        
        # Prepare data
        if isinstance(params['test_data'], str):
            from io import StringIO
            df = pd.read_csv(StringIO(params['test_data']))
        else:
            df = pd.DataFrame(params['test_data'])
        
        X = df[feature_names]
        y = df[target_column]
        
        # Apply preprocessing
        categorical_columns = model_data.get('categorical_columns', [])
        label_encoders = model_data.get('label_encoders', {})
        
        for col in categorical_columns:
            if col in X.columns and col in label_encoders:
                le = label_encoders[col]
                X[col] = le.transform(X[col].astype(str))
        
        # Apply scaling if needed
        if scaler is not None:
            X_scaled = scaler.transform(X)
            predictions = model.predict(X_scaled)
        else:
            predictions = model.predict(X)
        
        # Calculate metrics
        if len(np.unique(y)) < 20:  # Classification
            accuracy = accuracy_score(y, predictions)
            precision = precision_score(y, predictions, average='weighted')
            recall = recall_score(y, predictions, average='weighted')
            f1 = f1_score(y, predictions, average='weighted')
            
            metrics = {
                'accuracy': float(accuracy),
                'precision': float(precision),
                'recall': float(recall),
                'f1_score': float(f1)
            }
        else:  # Regression
            mse = mean_squared_error(y, predictions)
            r2 = r2_score(y, predictions)
            rmse = np.sqrt(mse)
            
            metrics = {
                'mse': float(mse),
                'rmse': float(rmse),
                'r2_score': float(r2)
            }
        
        result = {
            'success': True,
            'metrics': metrics,
            'sample_count': len(y),
            'model_type': model_data['model_type'],
            'evaluated_at': datetime.now().isoformat()
        }
        
        logger.info(f"Model evaluation completed: {metrics}")
        return result
        
    except Exception as e:
        logger.error(f"Model evaluation failed: {e}")
        return {
            'success': False,
            'error': str(e),
            'model_path': params.get('model_path', 'unknown')
        }

@activity.defn(name="preprocess_data")
async def preprocess_data(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Preprocess data for machine learning.
    
    Args:
        params: Dictionary containing:
            - data: Input data
            - operations: List of preprocessing operations
            - target_column: Optional target column name
    
    Returns:
        Dictionary with preprocessed data
    """
    logger.info("Preprocessing data for machine learning")
    
    try:
        # Prepare data
        if isinstance(params['data'], str):
            from io import StringIO
            df = pd.read_csv(StringIO(params['data']))
        else:
            df = pd.DataFrame(params['data'])
        
        original_shape = df.shape
        operations = params.get('operations', [])
        
        # Apply preprocessing operations
        for operation in operations:
            op_type = operation.get('type')
            op_params = operation.get('params', {})
            
            if op_type == 'remove_duplicates':
                df = df.drop_duplicates()
            
            elif op_type == 'handle_missing':
                strategy = op_params.get('strategy', 'mean')
                columns = op_params.get('columns', df.columns)
                
                for col in columns:
                    if col in df.columns:
                        if strategy == 'mean' and df[col].dtype in ['float64', 'int64']:
                            df[col].fillna(df[col].mean(), inplace=True)
                        elif strategy == 'median' and df[col].dtype in ['float64', 'int64']:
                            df[col].fillna(df[col].median(), inplace=True)
                        elif strategy == 'mode':
                            df[col].fillna(df[col].mode().iloc[0], inplace=True)
                        elif strategy == 'drop':
                            df.dropna(subset=[col], inplace=True)
                        else:
                            df[col].fillna(op_params.get('fill_value', ''), inplace=True)
            
            elif op_type == 'encode_categorical':
                columns = op_params.get('columns', df.select_dtypes(include=['object']).columns)
                encoding = op_params.get('encoding', 'label')
                
                for col in columns:
                    if col in df.columns:
                        if encoding == 'label':
                            le = LabelEncoder()
                            df[col] = le.fit_transform(df[col].astype(str))
                        elif encoding == 'onehot':
                            df = pd.get_dummies(df, columns=[col], prefix=col)
            
            elif op_type == 'scale_features':
                columns = op_params.get('columns', df.select_dtypes(include=['float64', 'int64']).columns)
                scaler_type = op_params.get('scaler', 'standard')
                
                if scaler_type == 'standard':
                    scaler = StandardScaler()
                elif scaler_type == 'minmax':
                    scaler = MinMaxScaler()
                else:
                    continue
                
                df[columns] = scaler.fit_transform(df[columns])
            
            elif op_type == 'remove_outliers':
                columns = op_params.get('columns', df.select_dtypes(include=['float64', 'int64']).columns)
                method = op_params.get('method', 'iqr')
                
                if method == 'iqr':
                    for col in columns:
                        if col in df.columns:
                            Q1 = df[col].quantile(0.25)
                            Q3 = df[col].quantile(0.75)
                            IQR = Q3 - Q1
                            df = df[(df[col] >= (Q1 - 1.5 * IQR)) & (df[col] <= (Q3 + 1.5 * IQR))]
        
        # Convert to CSV string for return
        from io import StringIO
        output = StringIO()
        df.to_csv(output, index=False)
        processed_data = output.getvalue()
        
        result = {
            'success': True,
            'data': processed_data,
            'original_shape': original_shape,
            'processed_shape': df.shape,
            'operations_applied': len(operations),
            'processed_at': datetime.now().isoformat()
        }
        
        logger.info(f"Data preprocessing completed: {original_shape} -> {df.shape}")
        return result
        
    except Exception as e:
        logger.error(f"Data preprocessing failed: {e}")
        return {
            'success': False,
            'error': str(e),
            'operations': params.get('operations', [])
        }