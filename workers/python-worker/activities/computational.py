"""
Computational Activities for Temporal Workflows

This module provides numerical computation, optimization, 
matrix operations, and signal processing capabilities.
"""

import json
import logging
from typing import Dict, Any, List
from datetime import datetime

import numpy as np
from scipy import optimize, linalg, signal
from scipy.sparse import csr_matrix
import matplotlib.pyplot as plt
import io
import base64

from temporalio import activity

logger = logging.getLogger(__name__)

@activity.defn(name="matrix_operations")
async def matrix_operations(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Perform matrix operations.
    
    Args:
        params: Dictionary containing:
            - matrices: Dictionary of matrices
            - operation: Operation type (multiply, add, invert, decompose, etc.)
            - operation_params: Additional parameters for the operation
    
    Returns:
        Dictionary with operation results
    """
    logger.info(f"Performing matrix operation: {params.get('operation', 'unknown')}")
    
    try:
        matrices = params['matrices']
        operation = params['operation']
        operation_params = params.get('operation_params', {})
        
        # Convert input to numpy arrays
        np_matrices = {}
        for name, matrix_data in matrices.items():
            np_matrices[name] = np.array(matrix_data)
        
        result_data = {}
        
        if operation == 'multiply':
            # Matrix multiplication
            matrix_names = list(np_matrices.keys())
            if len(matrix_names) < 2:
                raise ValueError("Matrix multiplication requires at least 2 matrices")
            
            result = np_matrices[matrix_names[0]]
            for i in range(1, len(matrix_names)):
                result = np.matmul(result, np_matrices[matrix_names[i]])
            
            result_data['result'] = result.tolist()
            result_data['shape'] = result.shape
            
        elif operation == 'add':
            # Matrix addition
            matrix_names = list(np_matrices.keys())
            if len(matrix_names) < 2:
                raise ValueError("Matrix addition requires at least 2 matrices")
            
            result = np_matrices[matrix_names[0]]
            for i in range(1, len(matrix_names)):
                result = result + np_matrices[matrix_names[i]]
            
            result_data['result'] = result.tolist()
            result_data['shape'] = result.shape
            
        elif operation == 'invert':
            # Matrix inversion
            matrix_name = operation_params.get('matrix', list(np_matrices.keys())[0])
            matrix = np_matrices[matrix_name]
            
            if matrix.shape[0] != matrix.shape[1]:
                raise ValueError("Matrix must be square for inversion")
            
            try:
                inverse = linalg.inv(matrix)
                result_data['inverse'] = inverse.tolist()
                result_data['determinant'] = float(linalg.det(matrix))
                result_data['condition_number'] = float(np.linalg.cond(matrix))
            except linalg.LinAlgError:
                # Use pseudo-inverse for singular matrices
                pseudo_inverse = linalg.pinv(matrix)
                result_data['pseudo_inverse'] = pseudo_inverse.tolist()
                result_data['determinant'] = 0.0
                result_data['singular'] = True
            
        elif operation == 'decompose':
            # Matrix decomposition
            matrix_name = operation_params.get('matrix', list(np_matrices.keys())[0])
            matrix = np_matrices[matrix_name]
            decomp_type = operation_params.get('type', 'svd')
            
            if decomp_type == 'svd':
                # Singular Value Decomposition
                U, s, Vt = linalg.svd(matrix)
                result_data['U'] = U.tolist()
                result_data['singular_values'] = s.tolist()
                result_data['Vt'] = Vt.tolist()
                result_data['rank'] = int(np.linalg.matrix_rank(matrix))
                
            elif decomp_type == 'eigen':
                # Eigenvalue decomposition
                if matrix.shape[0] != matrix.shape[1]:
                    raise ValueError("Matrix must be square for eigenvalue decomposition")
                
                eigenvals, eigenvecs = linalg.eig(matrix)
                result_data['eigenvalues'] = eigenvals.tolist()
                result_data['eigenvectors'] = eigenvecs.tolist()
                
            elif decomp_type == 'qr':
                # QR decomposition
                Q, R = linalg.qr(matrix)
                result_data['Q'] = Q.tolist()
                result_data['R'] = R.tolist()
                
            elif decomp_type == 'lu':
                # LU decomposition
                P, L, U = linalg.lu(matrix)
                result_data['P'] = P.tolist()
                result_data['L'] = L.tolist()
                result_data['U'] = U.tolist()
        
        elif operation == 'stats':
            # Matrix statistics
            matrix_name = operation_params.get('matrix', list(np_matrices.keys())[0])
            matrix = np_matrices[matrix_name]
            
            result_data['shape'] = matrix.shape
            result_data['size'] = int(matrix.size)
            result_data['dtype'] = str(matrix.dtype)
            result_data['mean'] = float(np.mean(matrix))
            result_data['std'] = float(np.std(matrix))
            result_data['min'] = float(np.min(matrix))
            result_data['max'] = float(np.max(matrix))
            result_data['norm'] = float(linalg.norm(matrix))
            
            if matrix.shape[0] == matrix.shape[1]:
                result_data['trace'] = float(np.trace(matrix))
                result_data['determinant'] = float(linalg.det(matrix))
                result_data['condition_number'] = float(np.linalg.cond(matrix))
        
        else:
            raise ValueError(f"Unsupported matrix operation: {operation}")
        
        result = {
            'success': True,
            'operation': operation,
            'result': result_data,
            'matrices_processed': list(np_matrices.keys()),
            'computed_at': datetime.now().isoformat()
        }
        
        logger.info(f"Matrix operation {operation} completed successfully")
        return result
        
    except Exception as e:
        logger.error(f"Matrix operation failed: {e}")
        return {
            'success': False,
            'error': str(e),
            'operation': params.get('operation', 'unknown')
        }

@activity.defn(name="numerical_computation")
async def numerical_computation(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Perform numerical computations.
    
    Args:
        params: Dictionary containing:
            - data: Input data
            - computation_type: Type of computation (integral, derivative, interpolation, etc.)
            - computation_params: Additional parameters
    
    Returns:
        Dictionary with computation results
    """
    logger.info(f"Performing numerical computation: {params.get('computation_type', 'unknown')}")
    
    try:
        data = np.array(params['data'])
        computation_type = params['computation_type']
        computation_params = params.get('computation_params', {})
        
        result_data = {}
        
        if computation_type == 'integral':
            # Numerical integration
            method = computation_params.get('method', 'simpson')
            
            if data.ndim == 1:
                # 1D integration using composite methods
                if method == 'simpson':
                    from scipy.integrate import simpson
                    result_data['integral'] = float(simpson(data))
                elif method == 'trapz':
                    result_data['integral'] = float(np.trapz(data))
                else:
                    result_data['integral'] = float(np.trapz(data))  # Default to trapezoid
            
            else:
                raise ValueError("Multi-dimensional integration not supported in this implementation")
        
        elif computation_type == 'derivative':
            # Numerical differentiation
            if data.ndim == 1:
                gradient = np.gradient(data)
                result_data['derivative'] = gradient.tolist()
                result_data['second_derivative'] = np.gradient(gradient).tolist()
            else:
                # Multi-dimensional gradient
                gradients = np.gradient(data)
                result_data['gradients'] = [g.tolist() for g in gradients]
        
        elif computation_type == 'interpolation':
            # Interpolation
            from scipy.interpolate import interp1d, griddata
            
            x_old = computation_params.get('x_old', np.arange(len(data)))
            x_new = computation_params.get('x_new', np.linspace(0, len(data)-1, len(data)*2))
            kind = computation_params.get('kind', 'linear')
            
            if data.ndim == 1:
                f = interp1d(x_old, data, kind=kind, fill_value='extrapolate')
                interpolated = f(x_new)
                result_data['x_new'] = np.array(x_new).tolist()
                result_data['interpolated'] = interpolated.tolist()
            else:
                raise ValueError("Multi-dimensional interpolation requires additional coordinates")
        
        elif computation_type == 'fft':
            # Fast Fourier Transform
            if data.ndim == 1:
                fft_result = np.fft.fft(data)
                frequencies = np.fft.fftfreq(len(data))
                
                result_data['fft_real'] = np.real(fft_result).tolist()
                result_data['fft_imag'] = np.imag(fft_result).tolist()
                result_data['magnitude'] = np.abs(fft_result).tolist()
                result_data['phase'] = np.angle(fft_result).tolist()
                result_data['frequencies'] = frequencies.tolist()
            else:
                # 2D FFT
                fft_result = np.fft.fft2(data)
                result_data['fft_real'] = np.real(fft_result).tolist()
                result_data['fft_imag'] = np.imag(fft_result).tolist()
                result_data['magnitude'] = np.abs(fft_result).tolist()
        
        elif computation_type == 'statistics':
            # Statistical computations
            result_data['mean'] = float(np.mean(data))
            result_data['median'] = float(np.median(data))
            result_data['std'] = float(np.std(data))
            result_data['var'] = float(np.var(data))
            result_data['min'] = float(np.min(data))
            result_data['max'] = float(np.max(data))
            result_data['sum'] = float(np.sum(data))
            result_data['product'] = float(np.prod(data))
            
            # Percentiles
            percentiles = computation_params.get('percentiles', [25, 50, 75, 90, 95, 99])
            result_data['percentiles'] = {
                f'p{p}': float(np.percentile(data, p)) for p in percentiles
            }
        
        elif computation_type == 'roots':
            # Find roots of polynomial
            if data.ndim == 1:
                roots = np.roots(data)
                result_data['roots_real'] = np.real(roots).tolist()
                result_data['roots_imag'] = np.imag(roots).tolist()
                result_data['num_real_roots'] = int(np.sum(np.abs(np.imag(roots)) < 1e-10))
            else:
                raise ValueError("Root finding requires 1D polynomial coefficients")
        
        else:
            raise ValueError(f"Unsupported computation type: {computation_type}")
        
        result = {
            'success': True,
            'computation_type': computation_type,
            'result': result_data,
            'input_shape': data.shape,
            'computed_at': datetime.now().isoformat()
        }
        
        logger.info(f"Numerical computation {computation_type} completed successfully")
        return result
        
    except Exception as e:
        logger.error(f"Numerical computation failed: {e}")
        return {
            'success': False,
            'error': str(e),
            'computation_type': params.get('computation_type', 'unknown')
        }

@activity.defn(name="optimization")
async def optimization(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Perform optimization tasks.
    
    Args:
        params: Dictionary containing:
            - objective_function: Function definition or data points
            - method: Optimization method (minimize, maximize, linear_programming)
            - constraints: Optimization constraints
            - bounds: Variable bounds
            - initial_guess: Starting point for optimization
    
    Returns:
        Dictionary with optimization results
    """
    logger.info(f"Performing optimization: {params.get('method', 'unknown')}")
    
    try:
        method = params['method']
        result_data = {}
        
        if method == 'curve_fitting':
            # Curve fitting optimization
            x_data = np.array(params['x_data'])
            y_data = np.array(params['y_data'])
            func_type = params.get('func_type', 'polynomial')
            degree = params.get('degree', 2)
            
            if func_type == 'polynomial':
                # Polynomial fitting
                coefficients = np.polyfit(x_data, y_data, degree)
                poly_func = np.poly1d(coefficients)
                
                # Calculate R-squared
                y_pred = poly_func(x_data)
                ss_res = np.sum((y_data - y_pred) ** 2)
                ss_tot = np.sum((y_data - np.mean(y_data)) ** 2)
                r_squared = 1 - (ss_res / ss_tot)
                
                result_data['coefficients'] = coefficients.tolist()
                result_data['r_squared'] = float(r_squared)
                result_data['residuals'] = (y_data - y_pred).tolist()
                
                # Generate fitted curve for plotting
                x_fit = np.linspace(x_data.min(), x_data.max(), 100)
                y_fit = poly_func(x_fit)
                result_data['fitted_curve'] = {
                    'x': x_fit.tolist(),
                    'y': y_fit.tolist()
                }
            
            elif func_type == 'exponential':
                # Exponential fitting: y = a * exp(b * x)
                from scipy.optimize import curve_fit
                
                def exp_func(x, a, b):
                    return a * np.exp(b * x)
                
                popt, pcov = curve_fit(exp_func, x_data, y_data)
                result_data['parameters'] = {
                    'a': float(popt[0]),
                    'b': float(popt[1])
                }
                result_data['covariance'] = pcov.tolist()
                
                # Generate fitted curve
                x_fit = np.linspace(x_data.min(), x_data.max(), 100)
                y_fit = exp_func(x_fit, *popt)
                result_data['fitted_curve'] = {
                    'x': x_fit.tolist(),
                    'y': y_fit.tolist()
                }
        
        elif method == 'minimize':
            # Function minimization
            from scipy.optimize import minimize
            
            # This is a simplified implementation for common functions
            func_type = params.get('func_type', 'quadratic')
            initial_guess = np.array(params.get('initial_guess', [0, 0]))
            bounds = params.get('bounds')
            
            if func_type == 'quadratic':
                # Minimize a quadratic function defined by coefficients
                coefficients = np.array(params.get('coefficients', [1, 1, 0]))  # ax^2 + bx + c
                
                def quadratic(x):
                    return coefficients[0] * x[0]**2 + coefficients[1] * x[0] + coefficients[2]
                
                result = optimize.minimize(quadratic, initial_guess, bounds=bounds)
                
            elif func_type == 'rosenbrock':
                # Rosenbrock function (common test function)
                def rosenbrock(x):
                    return 100 * (x[1] - x[0]**2)**2 + (1 - x[0])**2
                
                result = optimize.minimize(rosenbrock, initial_guess, bounds=bounds)
            
            else:
                raise ValueError(f"Unsupported function type: {func_type}")
            
            result_data['optimal_point'] = result.x.tolist()
            result_data['optimal_value'] = float(result.fun)
            result_data['success'] = bool(result.success)
            result_data['message'] = result.message
            result_data['iterations'] = int(result.nit)
        
        elif method == 'linear_programming':
            # Linear programming
            from scipy.optimize import linprog
            
            c = np.array(params['objective_coefficients'])  # Coefficients for objective function
            A_ub = np.array(params.get('inequality_constraints', []))  # Inequality constraint matrix
            b_ub = np.array(params.get('inequality_bounds', []))  # Inequality bounds
            A_eq = np.array(params.get('equality_constraints', []))  # Equality constraint matrix
            b_eq = np.array(params.get('equality_bounds', []))  # Equality bounds
            bounds = params.get('variable_bounds')  # Variable bounds
            
            # Handle empty arrays
            A_ub = A_ub if A_ub.size > 0 else None
            b_ub = b_ub if b_ub.size > 0 else None
            A_eq = A_eq if A_eq.size > 0 else None
            b_eq = b_eq if b_eq.size > 0 else None
            
            result = linprog(c, A_ub=A_ub, b_ub=b_ub, A_eq=A_eq, b_eq=b_eq, bounds=bounds, method='highs')
            
            result_data['optimal_solution'] = result.x.tolist() if result.x is not None else None
            result_data['optimal_value'] = float(result.fun) if result.fun is not None else None
            result_data['success'] = bool(result.success)
            result_data['message'] = result.message
            result_data['iterations'] = int(result.nit)
        
        else:
            raise ValueError(f"Unsupported optimization method: {method}")
        
        result = {
            'success': True,
            'method': method,
            'result': result_data,
            'optimized_at': datetime.now().isoformat()
        }
        
        logger.info(f"Optimization {method} completed successfully")
        return result
        
    except Exception as e:
        logger.error(f"Optimization failed: {e}")
        return {
            'success': False,
            'error': str(e),
            'method': params.get('method', 'unknown')
        }

@activity.defn(name="signal_processing")
async def signal_processing(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Perform signal processing operations.
    
    Args:
        params: Dictionary containing:
            - signal_data: Input signal data
            - operation: Processing operation (filter, smooth, detect_peaks, etc.)
            - operation_params: Additional parameters
    
    Returns:
        Dictionary with signal processing results
    """
    logger.info(f"Performing signal processing: {params.get('operation', 'unknown')}")
    
    try:
        signal_data = np.array(params['signal_data'])
        operation = params['operation']
        operation_params = params.get('operation_params', {})
        
        result_data = {}
        
        if operation == 'filter':
            # Signal filtering
            filter_type = operation_params.get('filter_type', 'butterworth')
            filter_order = operation_params.get('order', 4)
            cutoff_freq = operation_params.get('cutoff', 0.1)
            filter_mode = operation_params.get('mode', 'lowpass')
            
            if filter_type == 'butterworth':
                # Butterworth filter
                if filter_mode == 'lowpass':
                    b, a = signal.butter(filter_order, cutoff_freq, btype='low')
                elif filter_mode == 'highpass':
                    b, a = signal.butter(filter_order, cutoff_freq, btype='high')
                elif filter_mode == 'bandpass':
                    low_freq = operation_params.get('low_cutoff', 0.05)
                    high_freq = operation_params.get('high_cutoff', 0.15)
                    b, a = signal.butter(filter_order, [low_freq, high_freq], btype='band')
                else:
                    raise ValueError(f"Unsupported filter mode: {filter_mode}")
                
                filtered_signal = signal.filtfilt(b, a, signal_data)
                result_data['filtered_signal'] = filtered_signal.tolist()
            
            elif filter_type == 'median':
                # Median filter
                kernel_size = operation_params.get('kernel_size', 5)
                filtered_signal = signal.medfilt(signal_data, kernel_size=kernel_size)
                result_data['filtered_signal'] = filtered_signal.tolist()
            
            elif filter_type == 'savgol':
                # Savitzky-Golay filter
                window_length = operation_params.get('window_length', 11)
                polyorder = operation_params.get('polyorder', 3)
                filtered_signal = signal.savgol_filter(signal_data, window_length, polyorder)
                result_data['filtered_signal'] = filtered_signal.tolist()
        
        elif operation == 'smooth':
            # Signal smoothing
            method = operation_params.get('method', 'moving_average')
            
            if method == 'moving_average':
                window_size = operation_params.get('window_size', 5)
                smoothed = np.convolve(signal_data, np.ones(window_size)/window_size, mode='valid')
                result_data['smoothed_signal'] = smoothed.tolist()
            
            elif method == 'gaussian':
                from scipy.ndimage import gaussian_filter1d
                sigma = operation_params.get('sigma', 1.0)
                smoothed = gaussian_filter1d(signal_data, sigma=sigma)
                result_data['smoothed_signal'] = smoothed.tolist()
        
        elif operation == 'detect_peaks':
            # Peak detection
            height = operation_params.get('height', None)
            distance = operation_params.get('distance', 1)
            prominence = operation_params.get('prominence', None)
            
            peaks, properties = signal.find_peaks(signal_data, height=height, distance=distance, prominence=prominence)
            
            result_data['peak_indices'] = peaks.tolist()
            result_data['peak_values'] = signal_data[peaks].tolist()
            result_data['peak_count'] = int(len(peaks))
            
            if 'peak_heights' in properties:
                result_data['peak_heights'] = properties['peak_heights'].tolist()
            if 'prominences' in properties:
                result_data['prominences'] = properties['prominences'].tolist()
        
        elif operation == 'spectral_analysis':
            # Spectral analysis
            fs = operation_params.get('sampling_rate', 1.0)
            
            # Power Spectral Density
            frequencies, psd = signal.periodogram(signal_data, fs=fs)
            result_data['frequencies'] = frequencies.tolist()
            result_data['psd'] = psd.tolist()
            
            # Spectrogram
            if len(signal_data) > 256:  # Only compute if signal is long enough
                f, t, Sxx = signal.spectrogram(signal_data, fs=fs)
                result_data['spectrogram'] = {
                    'frequencies': f.tolist(),
                    'time': t.tolist(),
                    'magnitude': Sxx.tolist()
                }
        
        elif operation == 'envelope':
            # Signal envelope detection
            method = operation_params.get('method', 'hilbert')
            
            if method == 'hilbert':
                analytic_signal = signal.hilbert(signal_data)
                amplitude_envelope = np.abs(analytic_signal)
                result_data['envelope'] = amplitude_envelope.tolist()
                result_data['instantaneous_phase'] = np.angle(analytic_signal).tolist()
                result_data['instantaneous_frequency'] = np.diff(np.unwrap(np.angle(analytic_signal))).tolist()
        
        else:
            raise ValueError(f"Unsupported signal processing operation: {operation}")
        
        result = {
            'success': True,
            'operation': operation,
            'result': result_data,
            'input_length': len(signal_data),
            'processed_at': datetime.now().isoformat()
        }
        
        logger.info(f"Signal processing {operation} completed successfully")
        return result
        
    except Exception as e:
        logger.error(f"Signal processing failed: {e}")
        return {
            'success': False,
            'error': str(e),
            'operation': params.get('operation', 'unknown')
        }