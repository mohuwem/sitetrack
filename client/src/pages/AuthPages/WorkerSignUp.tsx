import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import WorkerSignUpForm from "../../components/auth/WorkerSignUpForm";

export default function WorkerSignUp() {
  return (
    <>
      <PageMeta title="Worker Sign Up | SiteTrack" description="Create your SiteTrack worker account" />
      <AuthLayout>
        <WorkerSignUpForm />
      </AuthLayout>
    </>
  );
}
