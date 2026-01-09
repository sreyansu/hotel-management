import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { signIn } from '../lib/firebase';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirect = searchParams.get('redirect') || '/';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signIn(email, password);
            navigate(redirect);
        } catch (err: any) {
            console.error('Login error:', err);
            if (err.code === 'auth/invalid-credential') {
                setError('Invalid email or password');
            } else if (err.code === 'auth/too-many-requests') {
                setError('Too many failed attempts. Please try again later.');
            } else {
                setError('Failed to sign in. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 animate-fade-in">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Link to="/" className="inline-flex items-center gap-2 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-2xl">G</span>
                        </div>
                    </Link>
                    <h1 className="font-display text-3xl font-bold text-gray-900">Welcome Back</h1>
                    <p className="text-gray-600 mt-2">Sign in to your account to continue</p>
                </div>

                <div className="card p-8">
                    {error && (
                        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm mb-6">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="label">
                                <Mail className="w-4 h-4 inline mr-1" />
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input"
                                placeholder="you@example.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="label">
                                <Lock className="w-4 h-4 inline mr-1" />
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input pr-12"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full py-3 text-lg"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-gray-600">
                        Don't have an account?{' '}
                        <Link to={`/register${redirect !== '/' ? `?redirect=${redirect}` : ''}`} className="text-primary-600 font-medium hover:underline">
                            Sign up
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
