import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/queryClient';

type Suggestion = { placeId: string; description: string };
type Props = {
  city: string;
  address: string;
  onAddressChange: (address: string) => void;
  onPincodeChange: (pincode: string) => void;
};

export default function AddressSelection({ city, address, onAddressChange, onPincodeChange }: Props) {
  const { data: config, isError: configError, isLoading } = useQuery<{ enabled: boolean }>({
    queryKey: ['/api/addresses/config'],
  });
  const [manual, setManual] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selectedBase, setSelectedBase] = useState('');
  const [unit, setUnit] = useState('');
  const [highlighted, setHighlighted] = useState(-1);
  const token = useRef(crypto.randomUUID());
  const generation = useRef(0);
  const currentCity = useRef(city);
  const fallback = manual || configError || config?.enabled === false;

  useEffect(() => {
    if (city !== currentCity.current) {
      currentCity.current = city;
      generation.current++;
      setQuery(''); setSuggestions([]); setSearched(false); setError('');
      setSelectedBase(''); setUnit(''); setBusy(false);
      onAddressChange(''); onPincodeChange('');
    }
  }, [city, onAddressChange, onPincodeChange]);

  useEffect(() => {
    const version = ++generation.current;
    setSuggestions([]); setSearched(false); setError(''); setHighlighted(-1);
    if (fallback || !config?.enabled || !city || query.trim().length < 3 || address) {
      setBusy(false);
      return;
    }
    const controller = new AbortController();
    setBusy(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/addresses/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: query, city, sessionToken: token.current }),
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Address search is unavailable');
        if (version === generation.current) {
          setSuggestions(result.suggestions); setSearched(true);
        }
      } catch (error) {
        if (!controller.signal.aborted && version === generation.current) {
          setError(error instanceof Error ? error.message : 'Address search is unavailable');
          setSearched(true);
        }
      } finally {
        if (version === generation.current) setBusy(false);
      }
    }, 400);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, city, fallback, config?.enabled, address]);

  async function select(item: Suggestion) {
    const version = ++generation.current;
    setBusy(true); setError('');
    try {
      const response = await apiRequest('POST', '/api/addresses/details', {
        placeId: item.placeId, sessionToken: token.current,
      });
      const result = await response.json();
      if (version !== generation.current) return;
      setSelectedBase(result.address); setUnit('');
      onAddressChange(result.address);
      onPincodeChange(result.pincode || '');
      setSuggestions([]); setQuery(''); setSearched(false);
      token.current = crypto.randomUUID();
    } catch {
      if (version === generation.current) {
        setError('Could not load this address. Try another result or enter the address manually.');
        setSearched(true);
      }
    } finally {
      if (version === generation.current) setBusy(false);
    }
  }

  if (fallback) return (
    <div>
      <Label htmlFor="address">Full address *</Label>
      <Input id="address" value={address} required maxLength={500}
        onChange={event => onAddressChange(event.target.value)}
        placeholder="House / flat, building, street and locality" className="mt-1" />
      <p className="text-xs text-muted-foreground mt-1">
        {manual ? 'Enter the full address if it could not be found in search.' :
          'Google address search is unavailable. Enter your full address manually.'}
      </p>
      {manual && config?.enabled && <Button type="button" variant="link" className="px-0"
        onClick={() => { setManual(false); onAddressChange(''); setQuery(''); setError(''); }}>
        Search addresses instead
      </Button>}
    </div>
  );

  return (
    <div className="space-y-2">
      <Label htmlFor="address">Full address *</Label>
      {address ? (
        <>
          <Input id="address" value={address} readOnly className="mt-1" />
          <Button type="button" variant="link" className="px-0" onClick={() => {
            generation.current++; setSelectedBase(''); setUnit('');
            onAddressChange(''); setQuery(''); setSuggestions([]); setError('');
          }}>Change address</Button>
          {selectedBase && <>
            <Label htmlFor="address-unit">House / flat number or delivery instructions</Label>
            <Input id="address-unit" value={unit} maxLength={150}
              placeholder="Add any details missing from the selected address"
              onChange={event => {
                setUnit(event.target.value);
                onAddressChange(event.target.value.trim() ? `${event.target.value.trim()}, ${selectedBase}` : selectedBase);
              }} />
          </>}
        </>
      ) : (
        <>
          <Input id="address" value={query} role="combobox" aria-autocomplete="list"
            aria-expanded={suggestions.length > 0} aria-controls="address-suggestions"
            aria-activedescendant={highlighted >= 0 ? `address-suggestion-${highlighted}` : undefined}
            autoComplete="off" maxLength={200} disabled={!city || isLoading}
            placeholder={city ? 'Search your building, street or locality' : 'Select a city first'}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'ArrowDown') { event.preventDefault(); setHighlighted(index => Math.min(index + 1, suggestions.length - 1)); }
              if (event.key === 'ArrowUp') { event.preventDefault(); setHighlighted(index => Math.max(index - 1, 0)); }
              if (event.key === 'Enter' && suggestions[highlighted]) { event.preventDefault(); void select(suggestions[highlighted]); }
              if (event.key === 'Escape') { setSuggestions([]); setHighlighted(-1); }
            }} />
          {busy && <p role="status" className="text-xs text-muted-foreground">Looking up your address…</p>}
          {suggestions.length > 0 && <div id="address-suggestions" role="listbox" aria-label="Matching addresses"
            className="rounded-md border bg-white divide-y max-h-56 overflow-auto">
            {suggestions.map((item, index) => <button type="button" role="option"
              id={`address-suggestion-${index}`} aria-selected={highlighted === index} key={item.placeId}
              disabled={busy} onClick={() => void select(item)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-orange-50 ${highlighted === index ? 'bg-orange-50' : ''}`}>
              {item.description}
            </button>)}
          </div>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {searched && !busy && !suggestions.length && !error &&
            <p className="text-xs text-muted-foreground">No matching address found.</p>}
          {(searched || error) && !busy && <Button type="button" variant="link" className="px-0"
            onClick={() => { generation.current++; setManual(true); onAddressChange(query); setSuggestions([]); }}>
            My exact address isn’t listed — enter manually
          </Button>}
        </>
      )}
      {config?.enabled && <div className="space-y-1">
        <img src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3.png"
          alt="Powered by Google" className="h-4 w-auto" />
        <p className="text-xs text-muted-foreground">
          Address search uses Google Places.{' '}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="underline">Google Privacy Policy</a>
          {' · '}
          <a href="https://maps.google.com/help/terms_maps/" target="_blank" rel="noreferrer" className="underline">Google Maps Terms</a>
        </p>
      </div>}
    </div>
  );
}
