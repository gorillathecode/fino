import { Redirect } from 'expo-router';
import { useFinoStore } from '../store/useFinoStore';

export default function Index() {
  const session = useFinoStore((s) => s.session);
  const onboarded = useFinoStore((s) => s.onboarded);
  const loading = useFinoStore((s) => s.loading);

  // wait until auth is resolved before redirecting
  if (loading) return null;
  if (!session) return <Redirect href="/auth" />;
  return <Redirect href={onboarded ? '/(tabs)/dashboard' : '/onboarding'} />;
}
