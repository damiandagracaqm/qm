import { useState, useRef, useEffect } from 'react';

function GroupCheckbox({ options, selected, onChange }) {
  const allChecked  = options.every(o => selected.includes(o));
  const someChecked = !allChecked && options.some(o => selected.includes(o));

  // indeterminate solo se puede setear por JS, no por atributo HTML
  const setRef = el => { if (el) el.indeterminate = someChecked; };

  function handleChange() {
    if (allChecked) {
      onChange(selected.filter(v => !options.includes(v)));
    } else {
      onChange([...selected, ...options.filter(o => !selected.includes(o))]);
    }
  }

  return <input ref={setRef} type="checkbox" checked={allChecked} onChange={handleChange} />;
}

export function MultiSelect({ label, options, optgroups, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  function toggle(val) {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  }

  const allOptions = optgroups ? optgroups.flatMap(g => g.options) : (options ?? []);
  const displayLabel = selected.length === 0 ? label
    : selected.length === 1 ? selected[0]
    : `${selected.length} seleccionados`;

  return (
    <div ref={ref} className="ms-wrap">
      <button className={`ms-btn${selected.length > 0 ? ' has-selection' : ''}`} onClick={() => setOpen(o => !o)} type="button">
        <span className="ms-label">{displayLabel}</span>
        <span className="ms-arrow">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="ms-dropdown">
          {selected.length > 0 && (
            <button className="ms-clear" onClick={() => onChange([])}>Limpiar selección</button>
          )}
          {optgroups ? optgroups.map(g => (
            <div key={g.label}>
              <label className="ms-option ms-group-header">
                <GroupCheckbox options={g.options} selected={selected} onChange={onChange} />
                {g.label}
              </label>
              {g.options.map(opt => (
                <label key={opt} className="ms-option ms-option-child">
                  <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
                  {opt}
                </label>
              ))}
            </div>
          )) : allOptions.map(opt => (
            <label key={opt} className="ms-option">
              <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
