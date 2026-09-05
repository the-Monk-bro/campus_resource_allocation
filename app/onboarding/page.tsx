import { updateProfile } from "@/actions/profileActions";

export default function OnboardingPage() {
    return (
        <div className="max-w-md mx-auto mt-12 p-6 bg-white rounded-xl shadow-md border border-slate-200">
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Complete Your Profile 🚀</h1>
            <p className="text-sm text-slate-600 mb-6">
                Please fill out your campus details to finish setting up your account.
            </p>

            <form action={updateProfile} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">User ID / Roll No</label>
                    <input
                        type="text"
                        name="id"
                        required
                        placeholder="e.g. 2026CS101"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                    <input
                        type="text"
                        name="department"
                        required
                        placeholder="e.g. Computer Science"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                    <select
                        name="role"
                        required
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900"
                    >
                        <option value="">Select Role...</option>
                        <option value="Student">Student</option>
                        <option value="Professor">Professor</option>
                        <option value="Staff">Staff</option>
                        <option value="Admin">Admin</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number (10 Digits)</label>
                    <input
                        type="tel"
                        name="phno"
                        minLength={10}
                        maxLength={10}
                        pattern="[0-9]{10}"
                        title="Phone number must be exactly 10 digits"
                        required
                        placeholder="9876543210"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900"
                    />
                </div>

                <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors"
                >
                    Save & Continue
                </button>
            </form>
        </div>
    );
}
