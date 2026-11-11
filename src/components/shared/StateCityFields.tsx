import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { MapPin, ChevronDown, X, Search } from 'lucide-react-native';
import { INDIA_STATES, INDIA_STATES_CITIES } from '../../data/indiaStatesCities';
import { useTheme, makeStyles } from '../../theme';

const OTHER = 'Other';

// "delhi" / "NEW delhi" -> "Delhi" / "New Delhi"
const titleCase = (s: string) =>
  s.trim().toLowerCase().replace(/\b([a-z])/g, (_, c) => c.toUpperCase());

// A pick-list field that opens a searchable modal. Used for both State and City.
function Dropdown({ value, placeholder, options, onSelect, disabled }: {
  value: string; placeholder: string; options: string[]; onSelect: (v: string) => void; disabled?: boolean;
}) {
  const s = useStyles();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const q = query.trim();
  // Case-insensitive contains-match; "Other" is never shown while searching (the
  // "Use ..." row below replaces it so the user can always enter a value not in the list).
  const filtered = q
    ? options.filter((o) => o !== OTHER && o.toLowerCase().includes(q.toLowerCase()))
    : options;
  const hasExact = options.some((o) => o.toLowerCase() === q.toLowerCase());
  return (
    <>
      <TouchableOpacity
        style={[s.field, disabled && s.fieldDisabled]}
        activeOpacity={0.8}
        disabled={disabled}
        onPress={() => { setQuery(''); setOpen(true); }}
      >
        <Text style={[s.fieldText, !value && s.placeholder]} numberOfLines={1}>{value || placeholder}</Text>
        <ChevronDown size={18} color={colors.textFaint} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <TouchableOpacity style={s.sheet} activeOpacity={1}>
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>{placeholder}</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={s.searchRow}>
              <Search size={16} color={colors.textFaint} />
              <TextInput
                style={s.searchInput}
                placeholder="Search..."
                placeholderTextColor={colors.textFaint}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                autoCapitalize="words"
              />
            </View>
            <ScrollView style={{ maxHeight: 340 }} keyboardShouldPersistTaps="handled">
              {filtered.map((o) => (
                <TouchableOpacity key={o} style={s.option} onPress={() => { onSelect(o); setOpen(false); }}>
                  <Text style={[s.optionText, value === o && s.optionActive]}>{o}</Text>
                </TouchableOpacity>
              ))}
              {/* Let the user commit whatever they typed when it isn't in the list
                  (e.g. a city we don't have) — no dead end. */}
              {q.length > 0 && !hasExact && (
                <TouchableOpacity style={s.option} onPress={() => { onSelect(titleCase(q)); setOpen(false); }}>
                  <Text style={[s.optionText, s.optionActive]}>Use "{titleCase(q)}"</Text>
                </TouchableOpacity>
              )}
              {filtered.length === 0 && q.length === 0 && <Text style={s.empty}>No matches</Text>}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// State -> City cascading fields, both required. Picking "Other" (or typing a state
// not in the list) swaps the dropdown for a free-text input. Edit-mode values that
// aren't in the static list are shown via the "Other" input, not a blank dropdown.
// `showErrors`: flag an empty State or City under the field (the caller turns it on
// once the user has touched the fields), instead of a pop-up on Save.
export function StateCityFields({ state, city, setState, setCity, showErrors = false }: {
  state: string; city: string; setState: (v: string) => void; setCity: (v: string) => void; showErrors?: boolean;
}) {
  const s = useStyles();
  const { colors } = useTheme();
  const [stateOther, setStateOther] = useState(() => !!state && !INDIA_STATES.includes(state));
  const [cityOther, setCityOther] = useState(false);

  useEffect(() => {
    if (state && !INDIA_STATES.includes(state)) { setStateOther(true); setCityOther(true); }
  }, [state]);
  useEffect(() => {
    const list = state && INDIA_STATES_CITIES[state] ? INDIA_STATES_CITIES[state] : [];
    if (city && list.length && !list.includes(city)) setCityOther(true);
  }, [state, city]);

  const stateOptions = [...INDIA_STATES, OTHER];
  const cityList = state && INDIA_STATES_CITIES[state] ? INDIA_STATES_CITIES[state] : [];
  const cityOptions = [...cityList, OTHER];

  const onStateSelect = (v: string) => {
    if (v === OTHER) { setStateOther(true); setState(''); setCityOther(true); }
    else { setStateOther(false); setState(v); setCityOther(false); }
    setCity(''); // city always resets when the state changes
  };
  const onCitySelect = (v: string) => {
    if (v === OTHER) { setCityOther(true); setCity(''); }
    else { setCityOther(false); setCity(v); }
  };

  return (
    <>
      <View style={s.section}>
        <View style={s.labelRow}><MapPin size={18} color={colors.text} /><Text style={s.label}>State</Text></View>
        {stateOther ? (
          <TextInput style={[s.input, showErrors && !state.trim() && s.inputError]} placeholder="Enter your state" placeholderTextColor={colors.textFaint} value={state} onChangeText={setState} autoCapitalize="words" />
        ) : (
          <Dropdown value={state} placeholder="Select state" options={stateOptions} onSelect={onStateSelect} />
        )}
        {showErrors && !state.trim() && <Text style={s.errorText}>Please {stateOther ? 'enter' : 'select'} your state</Text>}
      </View>

      <View style={s.section}>
        <View style={s.labelRow}><MapPin size={18} color={colors.text} /><Text style={s.label}>City</Text></View>
        {cityOther ? (
          <TextInput style={[s.input, showErrors && !city.trim() && s.inputError]} placeholder="Enter your city" placeholderTextColor={colors.textFaint} value={city} onChangeText={setCity} autoCapitalize="words" />
        ) : (
          <Dropdown
            value={city}
            placeholder={state ? 'Select city' : 'Select state first'}
            options={cityOptions}
            onSelect={onCitySelect}
            disabled={!state}
          />
        )}
        {showErrors && !city.trim() && <Text style={s.errorText}>Please {cityOther ? 'enter' : 'select'} your city</Text>}
      </View>
    </>
  );
}

const useStyles = makeStyles((c) => ({
  section: { marginBottom: 4 },
  inputError: { borderColor: c.danger },
  errorText: { fontSize: 12, color: c.danger, fontWeight: '600', marginTop: 6, marginLeft: 2 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  label: { fontSize: 15, fontWeight: '700', color: c.text },

  field: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.inputBg, borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingHorizontal: 16, height: 52 },
  fieldDisabled: { opacity: 0.5 },
  fieldText: { flex: 1, fontSize: 15, color: c.text, fontWeight: '600' },
  placeholder: { color: c.textFaint, fontWeight: '500' },

  input: { backgroundColor: c.inputBg, borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingHorizontal: 16, height: 52, fontSize: 15, color: c.text, fontWeight: '600' },

  overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 28, maxWidth: 560, width: '100%', alignSelf: 'center' },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 17, fontWeight: '900', color: c.text },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.surfaceAlt, borderRadius: 12, paddingHorizontal: 12, height: 44, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 15, color: c.text },
  option: { paddingVertical: 13, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: c.border },
  optionText: { fontSize: 15, color: c.text, fontWeight: '600' },
  optionActive: { color: '#15803d', fontWeight: '800' },
  empty: { textAlign: 'center', color: c.textFaint, paddingVertical: 20, fontWeight: '600' },
}));
