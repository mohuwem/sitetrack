import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import Button from "../ui/button/Button";
import { useAuth } from "../../context/AuthContext";

export default function WorkerSignUpForm() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!firstName || !lastName || !email || !password) {
      setError("Please complete all required fields.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!isChecked) {
      setError("You must agree before creating an account.");
      return;
    }

    try {
      setLoading(true);
      await register(firstName, lastName, email, password, "worker");
      navigate("/worker-dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-white dark:bg-gray-950">
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] bg-gray-800 text-white">
        <div className="flex h-full w-full flex-col justify-between px-10 py-12 xl:px-16">
          <div>
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500 text-lg font-bold text-white shadow-lg shadow-brand-500/30">
                S
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight">SiteTrack</h2>
                <p className="text-sm text-gray-400">Worker portal</p>
              </div>
            </Link>
          </div>

          <div className="max-w-xl">
            <span className="mb-4 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-medium uppercase tracking-[0.2em] text-brand-400">
              Join your team
            </span>
            <h1 className="mb-5 text-4xl font-semibold leading-tight xl:text-5xl">
              Create your worker account and connect to your site.
            </h1>
            <p className="mb-8 max-w-lg text-base leading-7 text-gray-300">
              Once registered, your manager can assign tasks and projects to you. You'll see your work, check in daily, and submit updates all in one place.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { val: "Simple", desc: "Easy setup in minutes" },
                { val: "Connected", desc: "Linked to your site team" },
                { val: "Mobile", desc: "Works from any device" },
              ].map((item) => (
                <div key={item.val} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                  <p className="text-2xl font-semibold text-white">{item.val}</p>
                  <p className="mt-1 text-sm text-gray-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="text-sm text-gray-500">For site workers and field staff.</div>
        </div>
      </div>

      <div className="flex w-full items-center justify-center px-6 py-10 sm:px-10 lg:w-1/2 xl:w-[45%]">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500 text-base font-bold text-white">S</div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">SiteTrack</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Worker portal</p>
              </div>
            </Link>
          </div>

          <div className="mb-8">
            <p className="mb-2 text-sm font-medium uppercase tracking-[0.18em] text-brand-500">Get started</p>
            <h1 className="mb-2 text-3xl font-semibold text-gray-900 dark:text-white">Create your worker account</h1>
            <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
              Your manager will link you to your site projects after you sign up.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label>First Name <span className="text-error-500">*</span></Label>
                <Input type="text" placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.currentTarget.value)} />
              </div>
              <div>
                <Label>Last Name <span className="text-error-500">*</span></Label>
                <Input type="text" placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.currentTarget.value)} />
              </div>
            </div>

            <div>
              <Label>Email <span className="text-error-500">*</span></Label>
              <Input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.currentTarget.value)} />
            </div>

            <div>
              <Label>Password <span className="text-error-500">*</span></Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password (min. 8 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 z-30 -translate-y-1/2 text-gray-500 dark:text-gray-400"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeIcon className="size-5 fill-current" /> : <EyeCloseIcon className="size-5 fill-current" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="flex items-start gap-3">
              <Checkbox checked={isChecked} onChange={setIsChecked} />
              <p className="text-sm leading-6 text-gray-600 dark:text-gray-400">I agree to the terms and privacy policy.</p>
            </div>

            <div className="pt-2">
              <Button className="w-full" size="sm" disabled={loading}>
                {loading ? "Creating account..." : "Create worker account"}
              </Button>
            </div>
          </form>

          <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm leading-6 text-gray-600 dark:text-gray-400">
              Already have an account?{" "}
              <Link to="/worker/signin" className="font-semibold text-brand-500 hover:text-brand-600 dark:text-brand-400">
                Sign in
              </Link>
            </p>
          </div>

          <div className="mt-3 text-center">
            <Link to="/signup" className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              Manager? Create a manager account instead
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
