'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  SUGGESTED_CUSTOM_ANSWERS,
  gradeType as gradeTypeEnum,
  employmentType as employmentTypeEnum,
  qualificationType as qualificationTypeEnum,
  ukHonours,
  type Education,
  type Experience,
  type Profile,
} from '@job-filler/shared';
import { saveProfileAction } from '@/app/dashboard/actions';

type Tab = 'personal' | 'education' | 'experience' | 'extra';

function Field(props: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="label">{props.label}</span>
      <input
        className="input"
        type={props.type ?? 'text'}
        value={props.value ?? ''}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
      />
      {props.hint && <span className="mt-1 block text-xs text-gray-500">{props.hint}</span>}
    </label>
  );
}

const emptyEducation: Education = {
  institution: '',
  qualificationType: 'BSc',
  gradeType: 'UK_HONOURS',
  current: false,
};
const emptyExperience: Experience = {
  jobTitle: '',
  employer: '',
  startDate: '',
  current: false,
};

export function ProfileEditor({ initial }: { initial: Profile }) {
  const [tab, setTab] = useState<Tab>('personal');
  const [profile, setProfile] = useState<Profile>(initial);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState<'idle' | 'ok' | 'error'>('idle');
  const [errors, setErrors] = useState<string[]>([]);

  const setPersonal = (patch: Partial<Profile['personal']>) =>
    setProfile((p) => ({ ...p, personal: { ...p.personal, ...patch } }));

  const updateEducation = (i: number, patch: Partial<Education>) =>
    setProfile((p) => ({
      ...p,
      education: p.education.map((e, idx) => (idx === i ? { ...e, ...patch } : e)),
    }));
  const updateExperience = (i: number, patch: Partial<Experience>) =>
    setProfile((p) => ({
      ...p,
      experience: p.experience.map((e, idx) => (idx === i ? { ...e, ...patch } : e)),
    }));

  const save = () => {
    setSaved('idle');
    startTransition(async () => {
      const res = await saveProfileAction(profile);
      if (res.ok) setSaved('ok');
      else {
        setSaved('error');
        setErrors(
          Object.entries(res.issues?.fieldErrors ?? {}).flatMap(([k, v]) =>
            (v ?? []).map((m) => `${k}: ${m}`),
          ),
        );
      }
    });
  };

  const tabs: [Tab, string][] = [
    ['personal', 'Personal'],
    ['education', 'Education'],
    ['experience', 'Experience'],
    ['extra', 'Extra questions'],
  ];

  return (
    <div>
      <nav className="mb-4 flex gap-1 border-b border-gray-200 dark:border-gray-800" data-tour="tabs">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              tab === id
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      <div data-tour="form">
      {tab === 'personal' && (
        <PersonalTab personal={profile.personal} set={setPersonal} />
      )}
      {tab === 'education' && (
        <ArrayTab
          title="Education"
          items={profile.education}
          onAdd={() =>
            setProfile((p) => ({ ...p, education: [...p.education, { ...emptyEducation }] }))
          }
          onRemove={(i) =>
            setProfile((p) => ({ ...p, education: p.education.filter((_, idx) => idx !== i) }))
          }
          render={(e, i) => <EducationCard e={e} i={i} update={updateEducation} />}
        />
      )}
      {tab === 'experience' && (
        <ArrayTab
          title="Work experience"
          items={profile.experience}
          onAdd={() =>
            setProfile((p) => ({ ...p, experience: [...p.experience, { ...emptyExperience }] }))
          }
          onRemove={(i) =>
            setProfile((p) => ({ ...p, experience: p.experience.filter((_, idx) => idx !== i) }))
          }
          render={(e, i) => <ExperienceCard e={e} i={i} update={updateExperience} />}
        />
      )}
      {tab === 'extra' && (
        <ExtraTab
          items={profile.customAnswers}
          onChange={(customAnswers) => setProfile((p) => ({ ...p, customAnswers }))}
        />
      )}
      </div>

      <div
        className="sticky bottom-0 mt-8 flex items-center gap-3 border-t border-gray-200 bg-gray-50 py-4 dark:border-gray-800 dark:bg-gray-950"
        data-tour="save"
      >
        <button className="btn" onClick={save} disabled={pending}>
          {pending ? 'Saving…' : 'Save profile'}
        </button>
        {saved === 'ok' && <span className="text-sm text-green-600">Saved.</span>}
        {saved === 'error' && (
          <span className="text-sm text-red-600">
            Couldn’t save: {errors.slice(0, 2).join('; ') || 'check your entries'}
          </span>
        )}
      </div>
    </div>
  );
}

function PersonalTab({
  personal,
  set,
}: {
  personal: Profile['personal'];
  set: (p: Partial<Profile['personal']>) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="First name" value={personal.firstName} onChange={(v) => set({ firstName: v })} />
      <Field label="Last name" value={personal.lastName} onChange={(v) => set({ lastName: v })} />
      <Field label="Middle name" value={personal.middleName} onChange={(v) => set({ middleName: v })} />
      <Field
        label="Preferred name"
        value={personal.preferredName}
        onChange={(v) => set({ preferredName: v })}
      />
      <Field
        label="Date of birth"
        type="date"
        value={personal.dateOfBirth}
        onChange={(v) => set({ dateOfBirth: v })}
        hint="Stored locally. Only used when a form explicitly asks."
      />
      <Field label="Email" type="email" value={personal.email} onChange={(v) => set({ email: v })} />
      <Field
        label="Phone"
        type="tel"
        value={personal.phone}
        onChange={(v) => set({ phone: v })}
        placeholder="+44 7700 900123"
      />
      <Field
        label="Nationality"
        value={personal.nationality}
        onChange={(v) => set({ nationality: v })}
      />
      <Field
        label="Address line 1"
        value={personal.addressLine1}
        onChange={(v) => set({ addressLine1: v })}
      />
      <Field
        label="Address line 2"
        value={personal.addressLine2}
        onChange={(v) => set({ addressLine2: v })}
      />
      <Field label="City / town" value={personal.city} onChange={(v) => set({ city: v })} />
      <Field label="County / region" value={personal.region} onChange={(v) => set({ region: v })} />
      <Field label="Postcode" value={personal.postcode} onChange={(v) => set({ postcode: v })} />
      <Field
        label="Country (ISO code)"
        value={personal.country}
        onChange={(v) => set({ country: v.toUpperCase().slice(0, 2) })}
        placeholder="GB"
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={!!personal.rightToWorkUK}
          onChange={(e) => set({ rightToWorkUK: e.target.checked })}
        />
        I have the right to work in the UK
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={!!personal.needsVisaSponsorship}
          onChange={(e) => set({ needsVisaSponsorship: e.target.checked })}
        />
        I need visa sponsorship
      </label>
      <Field
        label="LinkedIn URL"
        value={personal.linkedinUrl}
        onChange={(v) => set({ linkedinUrl: v })}
      />
      <Field label="GitHub URL" value={personal.githubUrl} onChange={(v) => set({ githubUrl: v })} />
      <Field
        label="Portfolio / website"
        value={personal.portfolioUrl}
        onChange={(v) => set({ portfolioUrl: v })}
      />
    </div>
  );
}

function ArrayTab<T>({
  title,
  items,
  onAdd,
  onRemove,
  render,
}: {
  title: string;
  items: T[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  render: (item: T, i: number) => React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      {items.length === 0 && (
        <p className="text-sm text-gray-500">No entries yet.</p>
      )}
      {items.map((item, i) => (
        <div key={i} className="card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-500">
              {title} #{i + 1}
            </h3>
            <button className="text-xs text-red-600 underline" onClick={() => onRemove(i)}>
              Remove
            </button>
          </div>
          {render(item, i)}
        </div>
      ))}
      <button className="btn-ghost" onClick={onAdd}>
        + Add {title.toLowerCase()}
      </button>
    </div>
  );
}

function EducationCard({
  e,
  i,
  update,
}: {
  e: Education;
  i: number;
  update: (i: number, patch: Partial<Education>) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="University / school" value={e.institution} onChange={(v) => update(i, { institution: v })} />
      <label className="block">
        <span className="label">Qualification</span>
        <select
          className="input"
          value={e.qualificationType}
          onChange={(v) => update(i, { qualificationType: v.target.value as Education['qualificationType'] })}
        >
          {qualificationTypeEnum.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>
      <Field label="Subject / field of study" value={e.fieldOfStudy} onChange={(v) => update(i, { fieldOfStudy: v })} />
      <label className="block">
        <span className="label">Grade type</span>
        <select
          className="input"
          value={e.gradeType}
          onChange={(v) => update(i, { gradeType: v.target.value as Education['gradeType'] })}
        >
          {gradeTypeEnum.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>
      {e.gradeType === 'UK_HONOURS' ? (
        <label className="block">
          <span className="label">Classification</span>
          <select
            className="input"
            value={e.gradeValue ?? ''}
            onChange={(v) => update(i, { gradeValue: v.target.value })}
          >
            <option value="">—</option>
            {ukHonours.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <Field
          label={e.gradeType === 'PERCENTAGE' ? 'Percentage' : e.gradeType === 'GPA' ? 'GPA' : 'Result'}
          value={e.gradeValue}
          onChange={(v) => update(i, { gradeValue: v })}
          placeholder={e.gradeType === 'PERCENTAGE' ? '72%' : e.gradeType === 'GPA' ? '3.8' : ''}
        />
      )}
      <Field label="Start (month)" type="month" value={e.startDate} onChange={(v) => update(i, { startDate: v })} />
      <Field label="End (month)" type="month" value={e.endDate} onChange={(v) => update(i, { endDate: v })} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={e.current} onChange={(ev) => update(i, { current: ev.target.checked })} />
        Currently studying here
      </label>
    </div>
  );
}

function ExperienceCard({
  e,
  i,
  update,
}: {
  e: Experience;
  i: number;
  update: (i: number, patch: Partial<Experience>) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Job title" value={e.jobTitle} onChange={(v) => update(i, { jobTitle: v })} />
      <Field label="Employer" value={e.employer} onChange={(v) => update(i, { employer: v })} />
      <Field label="Location" value={e.location} onChange={(v) => update(i, { location: v })} />
      <label className="block">
        <span className="label">Employment type</span>
        <select
          className="input"
          value={e.employmentType ?? ''}
          onChange={(v) => update(i, { employmentType: (v.target.value || undefined) as Experience['employmentType'] })}
        >
          <option value="">—</option>
          {employmentTypeEnum.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>
      <Field label="Start (month)" type="month" value={e.startDate} onChange={(v) => update(i, { startDate: v })} />
      <Field
        label="End (month)"
        type="month"
        value={e.endDate}
        onChange={(v) => update(i, { endDate: v })}
        hint={e.current ? 'Not needed — this is your current job' : undefined}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={e.current}
          onChange={(ev) => update(i, { current: ev.target.checked, endDate: ev.target.checked ? undefined : e.endDate })}
        />
        I currently work here
      </label>
      <label className="block sm:col-span-2">
        <span className="label">What you did (one bullet per line)</span>
        <textarea
          className="input min-h-24"
          value={e.description ?? ''}
          onChange={(ev) => update(i, { description: ev.target.value })}
        />
      </label>
    </div>
  );
}

function ExtraTab({
  items,
  onChange,
}: {
  items: Profile['customAnswers'];
  onChange: (items: Profile['customAnswers']) => void;
}) {
  const usedKeys = useMemo(() => new Set(items.map((i) => i.key)), [items]);
  const suggestions = SUGGESTED_CUSTOM_ANSWERS.filter((s) => !usedKeys.has(s.key));

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Answers to questions the standard fields don’t cover. The extension also adds
        questions here automatically when it meets one it can’t map.
      </p>

      {items.map((c, i) => (
        <div key={c.key} className="card">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">{c.label}</span>
            <button
              className="text-xs text-red-600 underline"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            >
              Remove
            </button>
          </div>
          <textarea
            className="input"
            value={c.value}
            onChange={(e) =>
              onChange(items.map((it, idx) => (idx === i ? { ...it, value: e.target.value } : it)))
            }
          />
        </div>
      ))}

      {suggestions.length > 0 && (
        <div className="card">
          <p className="mb-2 text-sm font-semibold">Common questions</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s.key}
                className="btn-ghost text-xs"
                onClick={() =>
                  onChange([
                    ...items,
                    { key: s.key, label: s.label, value: '', matchHints: s.matchHints ?? [], sensitive: false },
                  ])
                }
              >
                + {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <AddCustom
        onAdd={(label) => {
          const key =
            label
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '')
              .slice(0, 80) || `q-${items.length + 1}`;
          if (usedKeys.has(key)) return;
          onChange([...items, { key, label, value: '', matchHints: [], sensitive: false }]);
        }}
      />
    </div>
  );
}

function AddCustom({ onAdd }: { onAdd: (label: string) => void }) {
  const [label, setLabel] = useState('');
  return (
    <div className="flex gap-2">
      <input
        className="input"
        placeholder="Add your own question label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <button
        className="btn-ghost"
        onClick={() => {
          if (label.trim()) {
            onAdd(label.trim());
            setLabel('');
          }
        }}
      >
        Add
      </button>
    </div>
  );
}
