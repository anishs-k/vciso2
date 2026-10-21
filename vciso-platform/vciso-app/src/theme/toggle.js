// 3-way theme switcher (design from tg.txt).
// Sits in #theme-toggle-slot (left of "New Policy Draft") when that slot is on
// the page, otherwise floats bottom-right.
import { THEME, setTheme } from './index';

const OPTIONS = [
  { id: 'classic', label: 'Classic', color: '#f39c12', icon: '<path d="M12 4.25c-.41 0-.75-.34-.75-.75V1.75a.75.75 0 0 1 1.5 0v1.75c0 .41-.34.75-.75.75Zm0 18c-.41 0-.75-.34-.75-.75v-1.75a.75.75 0 0 1 1.5 0v1.75c0 .41-.34.75-.75.75ZM4.25 12c0 .41-.34.75-.75.75H1.75a.75.75 0 0 1 0-1.5h1.75c.41 0 .75.34.75.75Zm18 0c0 .41-.34.75-.75.75h-1.75a.75.75 0 0 1 0-1.5h1.75c.41 0 .75.34.75.75ZM7.05 7.05a.75.75 0 0 1-1.06 0L4.41 5.47a.75.75 0 0 1 1.06-1.06l1.58 1.58c.29.29.29.77 0 1.06Zm12.54 12.54a.75.75 0 0 1-1.06 0l-1.58-1.58a.75.75 0 0 1 1.06-1.06l1.58 1.58c.29.29.29.77 0 1.06ZM5.47 19.59a.75.75 0 0 1-1.06-1.06l1.58-1.58a.75.75 0 1 1 1.06 1.06l-1.58 1.58Zm13.06-12.54a.75.75 0 0 1-1.06-1.06l1.58-1.58a.75.75 0 0 1 1.06 1.06l-1.58 1.58ZM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z"/>' },
  { id: 'new', label: 'New', color: '#d35400', icon: '<path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10Zm0-2V4a8 8 0 1 0 0 16Z"/>' },
  { id: 'dark', label: 'Dark', color: '#3498db', icon: '<path d="M21.64 13a1 1 0 0 0-1.05-.14 8.049 8.049 0 0 1-3.37.73A8.15 8.15 0 0 1 9.08 5.49a8.59 8.59 0 0 1 .25-2A1 1 0 0 0 8 2.36 10.14 10.14 0 1 0 22 14.05a1 1 0 0 0-.36-1.05Z"/>' },
];

const CSS = `
.vts-wrap{position:fixed;right:16px;bottom:16px;z-index:2147483000;display:flex;width:150px;padding:4px;border-radius:30px;background:#e0e0e0;box-shadow:0 4px 14px rgba(0,0,0,.25),inset 0 2px 5px rgba(0,0,0,.1);font-family:system-ui,sans-serif}
.vts-wrap.vts-dark{background:#333}
.vts-btn{all:unset;flex:1;display:flex;justify-content:center;align-items:center;height:36px;cursor:pointer;z-index:2;color:#888;transition:color .3s,transform .2s}
.vts-btn:hover{transform:scale(1.12)}
.vts-btn svg{width:18px;height:18px;fill:currentColor}
.vts-slider{position:absolute;top:4px;left:4px;width:calc((100% - 8px)/3);height:36px;border-radius:20px;background:#fff;box-shadow:0 2px 5px rgba(0,0,0,.2);transition:transform .4s cubic-bezier(.5,1.5,.4,1);z-index:1}
.vts-dark .vts-slider{background:#555}
#theme-toggle-slot{display:inline-flex;align-items:center}
.vts-wrap.vts-inline{position:relative;right:auto;bottom:auto;z-index:auto;width:108px;padding:3px;box-shadow:inset 0 2px 4px rgba(0,0,0,.12)}
.vts-inline .vts-btn{height:26px}
.vts-inline .vts-btn svg{width:15px;height:15px}
.vts-inline .vts-slider{top:3px;left:3px;width:calc((100% - 6px)/3);height:26px}
`;

function build() {
  const wrap = document.createElement('div');
  wrap.className = 'vts-wrap' + (THEME === 'dark' ? ' vts-dark' : '');
  wrap.setAttribute('role', 'radiogroup');
  wrap.setAttribute('aria-label', 'Theme');

  const slider = document.createElement('div');
  slider.className = 'vts-slider';
  slider.style.transform = `translateX(${OPTIONS.findIndex(o => o.id === THEME) * 100}%)`;
  wrap.appendChild(slider);

  for (const o of OPTIONS) {
    const b = document.createElement('button');
    b.className = 'vts-btn';
    b.type = 'button';
    b.title = `${o.label} theme`;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(o.id === THEME));
    b.innerHTML = `<svg viewBox="0 0 24 24">${o.icon}</svg>`;
    if (o.id === THEME) b.style.color = o.color;
    b.addEventListener('click', () => setTheme(o.id));
    wrap.appendChild(b);
  }
  return wrap;
}

function mount() {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const wrap = build();

  // React renders/removes the slot as the user navigates, so keep re-placing the toggle.
  const place = () => {
    const slot = document.getElementById('theme-toggle-slot');
    if (slot) {
      if (wrap.parentNode !== slot) { wrap.classList.add('vts-inline'); slot.appendChild(wrap); }
    } else if (wrap.parentNode !== document.body) {
      wrap.classList.remove('vts-inline');
      document.body.appendChild(wrap);
    }
  };
  place();
  new MutationObserver(place).observe(document.body, { childList: true, subtree: true });
}

if (document.body) mount();
else document.addEventListener('DOMContentLoaded', mount);
