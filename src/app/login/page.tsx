import { AuthExperience } from '@/components/AuthExperience';

function safeReturnPath(value: string | undefined) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="login-page page-scroll">
      <AuthExperience variant="standalone" authenticatedDestination={safeReturnPath(params.returnTo)} />
    </main>
  );
}
