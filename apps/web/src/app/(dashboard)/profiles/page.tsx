'use client';

import { useEffect, useState } from 'react';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeading } from '@/components/kepler/page-heading';
import { PageState } from '@/components/kepler/page-state';
import { useKeplerApi } from '@/components/kepler/api-provider';
import type { Profile } from '@/lib/kepler-types';

const field = 'mt-2 h-9 w-full rounded-sm border bg-background px-3 text-sm outline-none focus:border-primary';
const textarea = 'mt-2 min-h-24 w-full rounded-sm border bg-background p-3 text-xs outline-none focus:border-primary';

export default function ProfilesPage() {
  const api = useKeplerApi(); const [profiles, setProfiles] = useState<Profile[] | null>(null); const [error, setError] = useState('');
  async function load() { try { setProfiles(await api('/api/v1/profiles')); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load profiles'); } }
  useEffect(() => { void load(); }, []); // API context is stable for the session.
  async function save(profile: Profile) { await api(`/api/v1/profiles/${profile.id}`, { method: 'PUT', body: JSON.stringify(profile) }); await load(); }
  return <><PageHeading title="Profiles" description="Taste, goals, skills, and constraints injected into agent context." />{error ? <PageState error message={error} /> : profiles === null ? <PageState message="Loading profiles…" /> : <div className="grid gap-5">{profiles.map((profile) => <ProfileEditor key={profile.id} profile={profile} onSave={save} />)}</div>}</>;
}

function ProfileEditor({ profile, onSave }: { profile: Profile; onSave: (profile: Profile) => Promise<void> }) {
  const [draft, setDraft] = useState(profile); const [preferences, setPreferences] = useState(JSON.stringify(profile.preferences, null, 2)); const [goals, setGoals] = useState(JSON.stringify(profile.goals, null, 2)); const [skills, setSkills] = useState(JSON.stringify(profile.skills, null, 2)); const [constraints, setConstraints] = useState(JSON.stringify(profile.constraints, null, 2)); const [message, setMessage] = useState('');
  async function save() { try { await onSave({ ...draft, preferences: JSON.parse(preferences), goals: JSON.parse(goals), skills: JSON.parse(skills), constraints: JSON.parse(constraints) }); setMessage('Saved'); } catch { setMessage('Every JSON field must be valid'); } }
  const jsonFields: Array<[string, string, (value: string) => void]> = [['Preferences', preferences, setPreferences], ['Goals', goals, setGoals], ['Skills', skills, setSkills], ['Constraints', constraints, setConstraints]];
  return <Card><CardHeader><div className="mb-2 flex items-center justify-between"><CardTitle>{profile.name}</CardTitle><Settings2 size={16} className="text-muted-foreground" /></div><CardDescription>Everything here becomes explicit user context for Kepler.</CardDescription></CardHeader><CardContent><div className="grid gap-4 md:grid-cols-2"><label className="text-xs text-muted-foreground">Name<input className={field} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><label className="text-xs text-muted-foreground">Description<input className={field} value={draft.description ?? ''} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>{jsonFields.map(([label, value, setter]) => <label key={label} className="text-xs text-muted-foreground">{label}<textarea className={textarea} value={value} onChange={(event) => setter(event.target.value)} /></label>)}</div><div className="mt-4 flex items-center gap-3"><Button size="sm" onClick={() => void save()}>Save profile</Button><span className="text-xs text-muted-foreground">{message}</span></div></CardContent></Card>;
}
