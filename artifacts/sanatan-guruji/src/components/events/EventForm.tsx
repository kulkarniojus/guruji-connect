import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import type { EventInput, EventRecord } from "@workspace/api-client-react";
import EventMediaEditor from "./EventMediaEditor";
import { DAYS } from "./eventUtils";

const istLocal = (iso: string) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso)).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
};

export const emptyEvent: EventInput = {
  name: "", description: "", classType: "", ageMin: 5, ageMax: 12, instructorName: "", instructorDetails: "", mode: "offline", city: "", state: "", location: "", meetingUrl: "",
  startDate: "", endDate: "", startTime: "10:00", durationMinutes: 60, frequency: "once", weekdays: [], basePrice: 0, discountedPrice: null,
  registrationDeadline: "", capacity: 20, paymentMode: "manual", media: [],
};

export function toInput(e: EventRecord): EventInput {
  return {
    name: e.name, description: e.description, classType: e.classType, ageMin: e.ageMin, ageMax: e.ageMax, instructorName: e.instructorName,
    instructorDetails: e.instructorDetails, mode: e.mode, city: e.city, state: e.state, location: e.location, meetingUrl: e.meetingUrl, startDate: e.startDate, endDate: e.endDate,
    startTime: e.startTime, durationMinutes: e.durationMinutes, frequency: e.frequency, weekdays: e.weekdays, basePrice: e.basePrice,
    discountedPrice: e.discountedPrice, registrationDeadline: e.registrationDeadline, capacity: e.capacity, paymentMode: e.paymentMode, media: e.media,
  };
}

const sel = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

function F({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label htmlFor={id}>{label}</Label>{children}</div>;
}

export default function EventForm({ initial, saving, error, onSubmit, onCancel }: { initial: EventInput; saving: boolean; error: string; onSubmit: (v: EventInput) => void; onCancel: () => void }) {
  const [v, setV] = useState<EventInput>(initial);
  const { data: cities = [], isLoading: citiesLoading } = useQuery<{ id: number; name: string; state: string }[]>({
    queryKey: ["/api/cities"],
  });
  const [deadline, setDeadline] = useState(initial.registrationDeadline ? istLocal(initial.registrationDeadline) : "");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const set = <K extends keyof EventInput>(k: K, val: EventInput[K]) => setV(p => ({ ...p, [k]: val }));
  const num = (k: "ageMin" | "ageMax" | "durationMinutes" | "capacity" | "basePrice") => (e: React.ChangeEvent<HTMLInputElement>) => set(k, Number(e.target.value));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const m = (s: string) => { setErr(s); };
    if (uploading) return m("Wait for uploads to finish.");
    if (!v.name.trim() || !v.description.trim() || !v.classType.trim() || !v.instructorName.trim()) return m("Name, description, class type and instructor are required.");
    if (!(v.ageMin >= 1 && v.ageMax <= 18 && v.ageMin <= v.ageMax)) return m("Ages must be within 1 to 18, min not above max.");
    if (!(Number.isInteger(v.capacity) && v.capacity >= 1 && v.capacity <= 10000)) return m("Capacity must be 1 to 10000.");
    if (!(v.durationMinutes >= 5 && v.durationMinutes <= 720)) return m("Duration must be 5 to 720 minutes.");
    if (!v.startDate || !v.endDate || v.endDate < v.startDate) return m("Choose valid start and end dates.");
    if (!v.city.trim() || !v.state.trim()) return m("Choose an active city for this event.");
    if (v.frequency === "once" && v.startDate !== v.endDate) return m("A one-time event must start and end on the same day.");
    const days = (Date.parse(v.endDate) - Date.parse(v.startDate)) / 86400000;
    if (v.frequency !== "once" && days > 365) return m("A recurring range can be at most 366 days.");
    if (v.frequency === "weekly" && v.weekdays.length === 0) return m("Pick at least one weekday.");
    if (!/^\d{2}:\d{2}$/.test(v.startTime)) return m("Start time is required.");
    if (v.mode === "offline" && !v.location.trim()) return m("Location is required for offline events.");
    if (v.basePrice < 0) return m("Fee cannot be negative.");
    if (v.discountedPrice !== null && (v.discountedPrice < 0 || v.discountedPrice > v.basePrice)) return m("Discounted fee must be between 0 and the base fee.");
    if (!deadline) return m("Registration deadline is required.");
    setErr("");
    onSubmit({ ...v, name: v.name.trim(), registrationDeadline: `${deadline}:00+05:30`, weekdays: v.frequency === "weekly" ? [...v.weekdays].sort() : [] });
  };

  return (
    <form onSubmit={submit} className="space-y-4" data-testid="form-event">
      <F id="ev-name" label="Name"><Input id="ev-name" value={v.name} onChange={e => set("name", e.target.value)} /></F>
      <F id="ev-desc" label="Description"><Textarea id="ev-desc" value={v.description} onChange={e => set("description", e.target.value)} /></F>
      <div className="grid gap-4 sm:grid-cols-3">
        <F id="ev-type" label="Class type"><Input id="ev-type" value={v.classType} onChange={e => set("classType", e.target.value)} /></F>
        <F id="ev-amin" label="Age min (1-18)"><Input id="ev-amin" type="number" value={v.ageMin} onChange={num("ageMin")} /></F>
        <F id="ev-amax" label="Age max (1-18)"><Input id="ev-amax" type="number" value={v.ageMax} onChange={num("ageMax")} /></F>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <F id="ev-inst" label="Instructor"><Input id="ev-inst" value={v.instructorName} onChange={e => set("instructorName", e.target.value)} /></F>
        <F id="ev-instd" label="Instructor details"><Input id="ev-instd" value={v.instructorDetails} onChange={e => set("instructorDetails", e.target.value)} /></F>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <F id="ev-mode" label="Mode"><select id="ev-mode" className={sel} value={v.mode} onChange={e => set("mode", e.target.value as EventInput["mode"])}><option value="offline">Offline</option><option value="online">Online</option></select></F>
        <F id="ev-city" label="Event city"><select id="ev-city" className={sel} value={String(cities.find(city => city.name === v.city && city.state === v.state)?.id ?? "")} disabled={citiesLoading || cities.length === 0} onChange={e => {
          const city = cities.find(item => String(item.id) === e.target.value);
          setV(current => ({ ...current, city: city?.name ?? "", state: city?.state ?? "" }));
        }}><option value="">{citiesLoading ? "Loading cities…" : cities.length ? "Select active city" : "No active cities"}</option>{cities.map(city => <option key={city.id} value={city.id}>{city.name}, {city.state}</option>)}</select>{!citiesLoading && cities.length === 0 && <p className="text-xs text-amber-700">Activate a city in Admin → Cities before creating an event.</p>}</F>
        <F id="ev-cap" label="Capacity (1-10000)"><Input id="ev-cap" type="number" value={v.capacity} onChange={num("capacity")} /></F>
      </div>
      <F id="ev-loc" label={v.mode === "offline" ? "Detailed address / venue" : "Detailed location (optional)"}><Input id="ev-loc" value={v.location} onChange={e => set("location", e.target.value)} placeholder={v.mode === "offline" ? "Building, street, area" : "Optional local venue details"} /></F>
      <F id="ev-url" label="Meeting URL (private: shown only to admins and guardians whose fee is fully paid, or free)"><Input id="ev-url" type="url" value={v.meetingUrl} onChange={e => set("meetingUrl", e.target.value)} /></F>
      <div className="grid gap-4 sm:grid-cols-4">
        <F id="ev-sd" label="Start date"><Input id="ev-sd" type="date" value={v.startDate} onChange={e => set("startDate", e.target.value)} /></F>
        <F id="ev-ed" label="End date"><Input id="ev-ed" type="date" value={v.endDate} onChange={e => set("endDate", e.target.value)} /></F>
        <F id="ev-st" label="Start time (IST)"><Input id="ev-st" type="time" value={v.startTime} onChange={e => set("startTime", e.target.value)} /></F>
        <F id="ev-dur" label="Minutes (5-720)"><Input id="ev-dur" type="number" value={v.durationMinutes} onChange={num("durationMinutes")} /></F>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <F id="ev-freq" label="Frequency"><select id="ev-freq" className={sel} value={v.frequency} onChange={e => set("frequency", e.target.value as EventInput["frequency"])}><option value="once">Once</option><option value="daily">Daily</option><option value="weekly">Weekly</option></select></F>
        {v.frequency === "weekly" && (
          <div className="space-y-1"><Label>Weekdays</Label><div className="flex flex-wrap gap-2">{DAYS.map((d, i) => (
            <label key={d} className="flex items-center gap-1 text-sm"><input type="checkbox" checked={v.weekdays.includes(i)} onChange={e => set("weekdays", e.target.checked ? [...v.weekdays, i] : v.weekdays.filter(x => x !== i))} />{d}</label>
          ))}</div></div>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <F id="ev-bp" label="Fee per child, full course (Rs.)"><Input id="ev-bp" type="number" min={0} step="0.01" value={v.basePrice} onChange={num("basePrice")} /></F>
        <F id="ev-dp" label="Discounted fee (blank for none)"><Input id="ev-dp" type="number" min={0} step="0.01" value={v.discountedPrice ?? ""} onChange={e => set("discountedPrice", e.target.value === "" ? null : Number(e.target.value))} /></F>
        <F id="ev-pm" label="Payment mode"><select id="ev-pm" className={sel} value={v.paymentMode} onChange={e => set("paymentMode", e.target.value as EventInput["paymentMode"])}><option value="manual">Manual</option><option value="online">Online</option><option value="both">Both</option></select></F>
      </div>
      <F id="ev-dl" label="Registration deadline (IST)"><Input id="ev-dl" type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} /></F>
      <div className="space-y-1"><Label>Media</Label><EventMediaEditor media={v.media} onChange={m => set("media", m)} onPending={setUploading} /></div>
      {(err || error) && <p role="alert" className="text-sm text-destructive" data-testid="text-event-form-error">{err || error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving || uploading} data-testid="button-save-event">{(saving || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{uploading ? "Uploading..." : "Save event"}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Close</Button>
      </div>
    </form>
  );
}
