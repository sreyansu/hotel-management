import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { signUp } from '../lib/firebase';
import { Mail, Lock, Eye, EyeOff, User, Phone, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirect = searchParams.get('redirect') || '/';

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            // Create Firebase user first
            await signUp(formData.email, formData.password);
            navigate(redirect);
        } catch (err: any) {
            console.error('Registration error:', err);
            if (err.code === 'auth/email-already-in-use') {
                setError('An account with this email already exists');
            } else {
                setError('Failed to create account. Please try again.');
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
                    <h1 className="font-display text-3xl font-bold text-gray-900">Create Account</h1>
                    <p className="text-gray-600 mt-2">Join us and start booking your perfect stay</p>
                </div>

                <div className="card p-8">
                    {error && (
                        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm mb-6">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="label">
                                <User className="w-4 h-4 inline mr-1" />
                                Full Name
                            </label>
                            <input
                                type="text"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                className="input"
                                placeholder="John Doe"
                                required
                            />
                        </div>

                        <div>
                            <label className="label">
                                <Mail className="w-4 h-4 inline mr-1" />
                                Email Address
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="input"
                                placeholder="you@example.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="label">
                                <Phone className="w-4 h-4 inline mr-1" />
                                Phone Number (Optional)
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="input"
                                placeholder="+91 98765 43210"
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
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="input pr-12"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
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

                        <div>
                            <label className="label">
                                <Lock className="w-4 h-4 inline mr-1" />
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="input"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full py-3 text-lg"
                        >
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-gray-600">
                        Already have an account?{' '}
                        <Link to={`/login${redirect !== '/' ? `?redirect=${redirect}` : ''}`} className="text-primary-600 font-medium hover:underline">
                            Sign in
                        </Link>
                    </div>
                </div>

                <p className="text-center text-xs text-gray-500 mt-6">
                    By creating an account, you agree to our Terms of Service and Privacy Policy.
                </p>
            </div>
        </div>
    );
}
