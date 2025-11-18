"""
Data Analysis Activities for Temporal Workflows

This module provides statistical analysis, correlation analysis, 
time series analysis, and clustering capabilities.
"""

import json
import logging
from typing import Dict, Any, List
from datetime import datetime

import numpy as np
import pandas as pd
from scipy import stats
from sklearn.cluster import KMeans, DBSCAN
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64

from temporalio import activity

logger = logging.getLogger(__name__)

@activity.defn(name="statistical_analysis")
async def statistical_analysis(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Perform statistical analysis on dataset.
    
    Args:
        params: Dictionary containing:
            - data: Input data
            - columns: Columns to analyze (optional)
            - analysis_type: Type of analysis (descriptive, inferential)
    
    Returns:
        Dictionary with statistical analysis results
    """
    logger.info("Performing statistical analysis")
    
    try:
        # Prepare data
        if isinstance(params['data'], str):
            from io import StringIO
            df = pd.read_csv(StringIO(params['data']))
        else:
            df = pd.DataFrame(params['data'])
        
        columns = params.get('columns', df.select_dtypes(include=[np.number]).columns.tolist())
        analysis_type = params.get('analysis_type', 'descriptive')
        
        results = {}
        
        if analysis_type in ['descriptive', 'all']:
            # Descriptive statistics
            desc_stats = {}
            for col in columns:
                if col in df.columns:
                    col_data = df[col].dropna()
                    desc_stats[col] = {
                        'count': int(len(col_data)),
                        'mean': float(col_data.mean()),
                        'median': float(col_data.median()),
                        'std': float(col_data.std()),
                        'min': float(col_data.min()),
                        'max': float(col_data.max()),
                        'q25': float(col_data.quantile(0.25)),
                        'q75': float(col_data.quantile(0.75)),
                        'skewness': float(stats.skew(col_data)),
                        'kurtosis': float(stats.kurtosis(col_data)),
                        'variance': float(col_data.var())
                    }
            results['descriptive'] = desc_stats
        
        if analysis_type in ['inferential', 'all']:
            # Inferential statistics
            inferential_stats = {}
            
            # Normality tests
            normality_tests = {}
            for col in columns:
                if col in df.columns:
                    col_data = df[col].dropna()
                    if len(col_data) > 8:  # Minimum sample size for Shapiro-Wilk
                        statistic, p_value = stats.shapiro(col_data[:5000])  # Limit to 5000 samples
                        normality_tests[col] = {
                            'test': 'shapiro_wilk',
                            'statistic': float(statistic),
                            'p_value': float(p_value),
                            'is_normal': p_value > 0.05
                        }
            
            inferential_stats['normality_tests'] = normality_tests
            
            # Correlation matrix
            if len(columns) > 1:
                correlation_matrix = df[columns].corr()
                inferential_stats['correlation_matrix'] = correlation_matrix.to_dict()
            
            results['inferential'] = inferential_stats
        
        # Data quality assessment
        quality_assessment = {
            'total_rows': int(len(df)),
            'total_columns': int(len(df.columns)),
            'missing_values': df.isnull().sum().to_dict(),
            'duplicate_rows': int(df.duplicated().sum()),
            'data_types': df.dtypes.astype(str).to_dict()
        }
        results['quality_assessment'] = quality_assessment
        
        result = {
            'success': True,
            'results': results,
            'columns_analyzed': columns,
            'analysis_type': analysis_type,
            'analyzed_at': datetime.now().isoformat()
        }
        
        logger.info(f"Statistical analysis completed for {len(columns)} columns")
        return result
        
    except Exception as e:
        logger.error(f"Statistical analysis failed: {e}")
        return {
            'success': False,
            'error': str(e),
            'analysis_type': params.get('analysis_type', 'unknown')
        }

@activity.defn(name="data_correlation")
async def data_correlation(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Analyze correlations between variables.
    
    Args:
        params: Dictionary containing:
            - data: Input data
            - method: Correlation method (pearson, spearman, kendall)
            - threshold: Correlation threshold for filtering
    
    Returns:
        Dictionary with correlation analysis results
    """
    logger.info("Analyzing data correlations")
    
    try:
        # Prepare data
        if isinstance(params['data'], str):
            from io import StringIO
            df = pd.read_csv(StringIO(params['data']))
        else:
            df = pd.DataFrame(params['data'])
        
        method = params.get('method', 'pearson')
        threshold = params.get('threshold', 0.5)
        
        # Select numeric columns
        numeric_df = df.select_dtypes(include=[np.number])
        
        if numeric_df.empty:
            raise ValueError("No numeric columns found for correlation analysis")
        
        # Calculate correlation matrix
        correlation_matrix = numeric_df.corr(method=method)
        
        # Find strong correlations
        strong_correlations = []
        for i in range(len(correlation_matrix.columns)):
            for j in range(i+1, len(correlation_matrix.columns)):
                corr_value = correlation_matrix.iloc[i, j]
                if abs(corr_value) >= threshold:
                    strong_correlations.append({
                        'variable1': correlation_matrix.columns[i],
                        'variable2': correlation_matrix.columns[j],
                        'correlation': float(corr_value),
                        'strength': 'strong' if abs(corr_value) >= 0.7 else 'moderate'
                    })
        
        # Generate correlation heatmap
        plt.figure(figsize=(10, 8))
        sns.heatmap(correlation_matrix, annot=True, cmap='coolwarm', center=0, fmt='.2f')
        plt.title(f'{method.capitalize()} Correlation Matrix')
        
        # Save plot as base64 string
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', bbox_inches='tight', dpi=150)
        buffer.seek(0)
        plot_data = base64.b64encode(buffer.getvalue()).decode()
        plt.close()
        
        result = {
            'success': True,
            'correlation_matrix': correlation_matrix.to_dict(),
            'strong_correlations': strong_correlations,
            'method': method,
            'threshold': threshold,
            'heatmap_plot': plot_data,
            'variables_analyzed': list(numeric_df.columns),
            'analyzed_at': datetime.now().isoformat()
        }
        
        logger.info(f"Correlation analysis completed: {len(strong_correlations)} strong correlations found")
        return result
        
    except Exception as e:
        logger.error(f"Correlation analysis failed: {e}")
        return {
            'success': False,
            'error': str(e),
            'method': params.get('method', 'pearson')
        }

@activity.defn(name="time_series_analysis")
async def time_series_analysis(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Perform time series analysis.
    
    Args:
        params: Dictionary containing:
            - data: Input data
            - datetime_column: Name of datetime column
            - value_column: Name of value column
            - frequency: Data frequency (D, H, M, etc.)
    
    Returns:
        Dictionary with time series analysis results
    """
    logger.info("Performing time series analysis")
    
    try:
        # Prepare data
        if isinstance(params['data'], str):
            from io import StringIO
            df = pd.read_csv(StringIO(params['data']))
        else:
            df = pd.DataFrame(params['data'])
        
        datetime_col = params['datetime_column']
        value_col = params['value_column']
        frequency = params.get('frequency', 'D')
        
        # Convert datetime column
        df[datetime_col] = pd.to_datetime(df[datetime_col])
        df = df.sort_values(datetime_col)
        
        # Set datetime as index
        df.set_index(datetime_col, inplace=True)
        
        # Resample if needed
        if frequency:
            df_resampled = df[value_col].resample(frequency).mean()
        else:
            df_resampled = df[value_col]
        
        # Basic time series statistics
        ts_stats = {
            'count': int(len(df_resampled)),
            'mean': float(df_resampled.mean()),
            'std': float(df_resampled.std()),
            'min': float(df_resampled.min()),
            'max': float(df_resampled.max()),
            'start_date': df_resampled.index.min().isoformat(),
            'end_date': df_resampled.index.max().isoformat()
        }
        
        # Trend analysis (simple linear trend)
        x = np.arange(len(df_resampled))
        slope, intercept, r_value, p_value, std_err = stats.linregress(x, df_resampled.values)
        
        trend_analysis = {
            'slope': float(slope),
            'intercept': float(intercept),
            'r_squared': float(r_value ** 2),
            'p_value': float(p_value),
            'trend_direction': 'increasing' if slope > 0 else 'decreasing' if slope < 0 else 'stable'
        }
        
        # Seasonality detection (basic)
        # Rolling statistics
        window = min(30, len(df_resampled) // 4)
        if window > 1:
            rolling_mean = df_resampled.rolling(window=window).mean()
            rolling_std = df_resampled.rolling(window=window).std()
            
            seasonality_stats = {
                'rolling_mean_variation': float(rolling_mean.std()),
                'rolling_std_variation': float(rolling_std.std()),
                'window_size': window
            }
        else:
            seasonality_stats = {
                'rolling_mean_variation': 0,
                'rolling_std_variation': 0,
                'window_size': 1
            }
        
        # Create time series plot
        plt.figure(figsize=(12, 6))
        plt.plot(df_resampled.index, df_resampled.values, label='Original')
        if window > 1:
            plt.plot(rolling_mean.index, rolling_mean.values, label=f'Rolling Mean ({window})')
        
        # Add trend line
        trend_line = slope * x + intercept
        plt.plot(df_resampled.index, trend_line, 'r--', label='Trend')
        
        plt.title(f'Time Series Analysis: {value_col}')
        plt.xlabel('Time')
        plt.ylabel(value_col)
        plt.legend()
        plt.xticks(rotation=45)
        
        # Save plot
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', bbox_inches='tight', dpi=150)
        buffer.seek(0)
        plot_data = base64.b64encode(buffer.getvalue()).decode()
        plt.close()
        
        result = {
            'success': True,
            'statistics': ts_stats,
            'trend_analysis': trend_analysis,
            'seasonality_stats': seasonality_stats,
            'plot': plot_data,
            'datetime_column': datetime_col,
            'value_column': value_col,
            'frequency': frequency,
            'analyzed_at': datetime.now().isoformat()
        }
        
        logger.info(f"Time series analysis completed: {trend_analysis['trend_direction']} trend detected")
        return result
        
    except Exception as e:
        logger.error(f"Time series analysis failed: {e}")
        return {
            'success': False,
            'error': str(e),
            'datetime_column': params.get('datetime_column', 'unknown'),
            'value_column': params.get('value_column', 'unknown')
        }

@activity.defn(name="clustering_analysis")
async def clustering_analysis(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Perform clustering analysis on data.
    
    Args:
        params: Dictionary containing:
            - data: Input data
            - columns: Columns to use for clustering
            - algorithm: Clustering algorithm (kmeans, dbscan)
            - n_clusters: Number of clusters (for kmeans)
            - algorithm_params: Additional algorithm parameters
    
    Returns:
        Dictionary with clustering results
    """
    logger.info("Performing clustering analysis")
    
    try:
        # Prepare data
        if isinstance(params['data'], str):
            from io import StringIO
            df = pd.read_csv(StringIO(params['data']))
        else:
            df = pd.DataFrame(params['data'])
        
        columns = params.get('columns', df.select_dtypes(include=[np.number]).columns.tolist())
        algorithm = params.get('algorithm', 'kmeans')
        algorithm_params = params.get('algorithm_params', {})
        
        # Select and prepare data
        X = df[columns].dropna()
        
        # Standardize features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        # Apply clustering algorithm
        if algorithm == 'kmeans':
            n_clusters = params.get('n_clusters', 3)
            clusterer = KMeans(n_clusters=n_clusters, random_state=42, **algorithm_params)
            cluster_labels = clusterer.fit_predict(X_scaled)
            cluster_centers = scaler.inverse_transform(clusterer.cluster_centers_)
            
            # Calculate inertia
            inertia = clusterer.inertia_
            
        elif algorithm == 'dbscan':
            eps = algorithm_params.get('eps', 0.5)
            min_samples = algorithm_params.get('min_samples', 5)
            clusterer = DBSCAN(eps=eps, min_samples=min_samples, **algorithm_params)
            cluster_labels = clusterer.fit_predict(X_scaled)
            cluster_centers = None
            inertia = None
            
        else:
            raise ValueError(f"Unsupported clustering algorithm: {algorithm}")
        
        # Analyze clusters
        unique_labels = np.unique(cluster_labels)
        n_clusters_found = len(unique_labels)
        if -1 in unique_labels:  # DBSCAN noise points
            n_clusters_found -= 1
        
        cluster_stats = {}
        for label in unique_labels:
            if label == -1:  # Noise points in DBSCAN
                cluster_stats['noise'] = {
                    'size': int(np.sum(cluster_labels == label)),
                    'percentage': float(np.mean(cluster_labels == label) * 100)
                }
            else:
                cluster_data = X[cluster_labels == label]
                cluster_stats[f'cluster_{label}'] = {
                    'size': int(len(cluster_data)),
                    'percentage': float(len(cluster_data) / len(X) * 100),
                    'center': cluster_centers[label].tolist() if cluster_centers is not None else None,
                    'mean_values': cluster_data.mean().to_dict(),
                    'std_values': cluster_data.std().to_dict()
                }
        
        # Dimensionality reduction for visualization (if > 2 dimensions)
        if len(columns) > 2:
            pca = PCA(n_components=2)
            X_pca = pca.fit_transform(X_scaled)
            explained_variance = pca.explained_variance_ratio_
        else:
            X_pca = X_scaled[:, :2]
            explained_variance = [1.0, 1.0]
        
        # Create clustering plot
        plt.figure(figsize=(10, 8))
        scatter = plt.scatter(X_pca[:, 0], X_pca[:, 1], c=cluster_labels, cmap='viridis', alpha=0.7)
        plt.colorbar(scatter)
        
        if cluster_centers is not None and len(columns) > 2:
            # Project centers to PCA space
            centers_pca = pca.transform(scaler.transform(cluster_centers))
            plt.scatter(centers_pca[:, 0], centers_pca[:, 1], 
                       c='red', marker='x', s=200, linewidths=3, label='Centroids')
            plt.legend()
        
        plt.title(f'Clustering Analysis ({algorithm.upper()})')
        plt.xlabel(f'PC1 ({explained_variance[0]:.2%} variance)' if len(columns) > 2 else columns[0])
        plt.ylabel(f'PC2 ({explained_variance[1]:.2%} variance)' if len(columns) > 2 else columns[1])
        
        # Save plot
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', bbox_inches='tight', dpi=150)
        buffer.seek(0)
        plot_data = base64.b64encode(buffer.getvalue()).decode()
        plt.close()
        
        result = {
            'success': True,
            'algorithm': algorithm,
            'clusters_found': int(n_clusters_found),
            'cluster_labels': cluster_labels.tolist(),
            'cluster_stats': cluster_stats,
            'inertia': float(inertia) if inertia is not None else None,
            'columns_used': columns,
            'plot': plot_data,
            'samples_analyzed': int(len(X)),
            'analyzed_at': datetime.now().isoformat()
        }
        
        logger.info(f"Clustering analysis completed: {n_clusters_found} clusters found using {algorithm}")
        return result
        
    except Exception as e:
        logger.error(f"Clustering analysis failed: {e}")
        return {
            'success': False,
            'error': str(e),
            'algorithm': params.get('algorithm', 'unknown')
        }