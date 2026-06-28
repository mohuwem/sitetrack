import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import WorkerSignInForm from "../../components/auth/WorkerSignInForm";

export default function WorkerSignIn() {
  return (
    <>
      <PageMeta title="Worker Sign In | SiteTrack" description="Sign in to your SiteTrack worker portal" />
      <AuthLayout>
        <WorkerSignInForm />
      </AuthLayout>
    </>
  );
}
