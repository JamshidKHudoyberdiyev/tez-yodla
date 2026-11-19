import { Redirect } from 'expo-router';
import { AUTH_REQUIRED, useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';

export default function Index() {
  const { state } = useStore();
  const auth = useAuth();
  if (AUTH_REQUIRED && (!auth.session || auth.initial === null)) return <Redirect href="/login" />;
  return <Redirect href={state.onboarded ? '/home' : AUTH_REQUIRED ? '/login' : '/onboarding'} />;
}
