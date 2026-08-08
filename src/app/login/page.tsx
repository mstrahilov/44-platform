import { AuthExperience } from '@/components/AuthExperience';

export default function LoginPage() {
  return (
    <main className="login-page page-scroll">
      <AuthExperience variant="standalone" authenticatedDestination="/" />
    </main>
  );
}
