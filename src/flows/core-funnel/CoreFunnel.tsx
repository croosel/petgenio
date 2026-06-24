import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type {
  ScreenIndex, AIStyle, Softness, Size, Scent, BoxColor,
  ProductConfig, PetData,
} from '@/flows/shared/types';
import { MOCK_PET, MOCK_CONFIG } from '@/flows/shared/mock-data';

// ─── Image Compression (prevent Vercel 4.5MB body limit) ───
function compressImage(file: File, maxDim = 1024, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas not supported'));
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

// ─── Costume Show Templates ───
const COSTUME_TEMPLATES = [
  { id: 'royal', emoji: '👑', title: 'Royal Portrait', desc: 'Renaissance oil painting', color: '#0D9488', sample: '/samples/royal.jpg' },
  { id: 'superhero', emoji: '🦸', title: 'Superhero', desc: 'Save the world, one nap at a time', color: '#FB7185', sample: '/samples/superhero.jpg' },
  { id: 'beach', emoji: '🏖️', title: 'Beach Vacation', desc: 'Tropical vibes & tiny sunglasses', color: '#0D9488', sample: '/samples/beach.jpg' },
  { id: 'europe', emoji: '🗼', title: 'Paris Trip', desc: 'Café, croissant, cute pet', color: '#FB7185', sample: '/samples/paris.jpg' },
  { id: 'sagrada', emoji: '⛪', title: 'Sagrada Familia', desc: 'Gaudi meets kitty', color: '#D4A574', sample: '/samples/sagrada.jpg' },
  { id: 'space', emoji: '🚀', title: 'Space Explorer', desc: 'One small step for petkind', color: '#0D9488', sample: '/samples/space.jpg' },
  { id: 'christmas', emoji: '🎄', title: 'Holiday Festive', desc: 'Cozy holiday sweater vibes', color: '#0D9488', sample: '/samples/christmas.jpg' },
  { id: 'anime', emoji: '🎌', title: 'Anime Hero', desc: 'Studio Ghibli cuteness', color: '#FB7185', sample: '/samples/anime.jpg' },
];

// ─── Social Media Share Links ───
const SOCIAL_LINKS = [
  { name: 'TikTok', emoji: '🎵', color: '#0D9488' },
  { name: 'Instagram', emoji: '📷', color: '#D4A574' },
  { name: 'Facebook', emoji: '👤', color: '#FB7185' },
  { name: 'X', emoji: '𝕏', color: '#134E4A' },
  { name: 'LinkedIn', emoji: '💼', color: '#5B7B77' },
];

// ─── Style cards data (for plush) ───
const STYLE_OPTIONS: { id: AIStyle; name: string; desc: string; emoji: string }[] = [
  { id: 'pixar', name: 'Pixar Cutie', desc: 'Big eyes, round face — maximum cute', emoji: '🎬' },
  { id: 'blind-box', name: 'Blind Box', desc: 'Collectible art toy aesthetic', emoji: '🎁' },
  { id: 'royal', name: 'Royal Portrait', desc: 'Renaissance oil painting vibe', emoji: '👑' },
];

// ─── Config option labels ───
const SOFTNESS_OPTIONS: { id: Softness; label: string; emoji: string }[] = [
  { id: 'soft', label: 'Cloud Soft', emoji: '☁️' },
  { id: 'medium', label: 'Just Right', emoji: '🤗' },
  { id: 'firm', label: 'Huggable Firm', emoji: '🧸' },
];
const SIZE_OPTIONS: { id: Size; label: string; inch: string }[] = [
  { id: 'mini', label: 'Mini', inch: '6"' },
  { id: 'standard', label: 'Standard', inch: '10"' },
  { id: 'jumbo', label: 'Jumbo', inch: '16"' },
];
const SCENT_OPTIONS: { id: Scent; label: string; emoji: string }[] = [
  { id: 'lavender', label: 'Lavender', emoji: '💜' },
  { id: 'vanilla', label: 'Vanilla', emoji: '🍦' },
  { id: 'unscented', label: 'Unscented', emoji: '🌿' },
];
const BOX_COLORS: { id: BoxColor; hex: string; label: string }[] = [
  { id: 'teal', hex: '#0D9488', label: 'Deep Teal' },
  { id: 'sand', hex: '#D4A574', label: 'Warm Sand' },
  { id: 'mint', hex: '#F0FDFA', label: 'Mint Cream' },
  { id: 'deep', hex: '#134E4A', label: 'Teal Dark' },
];

// ─── Helpers ───
function brandColor() {
  return 'var(--petgenio-teal)';
}

// Generate a dynamic order number: PG-YYYYMMDD-XXXX
function generateOrderNumber(): string {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `PG-${ymd}-${rand}`;
}

// Calculate delivery date range (7–14 days from now, based on the "what happens next" timeline)
function getDeliveryRange(): string {
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const start = new Date();
  start.setDate(start.getDate() + 7);
  const end = new Date();
  end.setDate(end.getDate() + 14);
  return `${fmt(start)} – ${fmt(end)}`;
}

// Generate semi-random personality traits seeded by pet name
function generateTraits(petName: string): { emoji: string; label: string; value: number; color: string }[] {
  // Simple hash from pet name for stable-but-varied results
  const hash = petName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const traits = [
    { emoji: '😎', label: 'Charm Level', color: '#0D9488', base: 75, range: 24 },
    { emoji: '😴', label: 'Nap Master', color: '#5B7B77', base: 60, range: 39 },
    { emoji: '🍖', label: 'Treat Drive', color: '#FB7185', base: 80, range: 19 },
    { emoji: '👑', label: 'Royalty Vibe', color: '#134E4A', base: 70, range: 29 },
    { emoji: '🧠', label: 'Sassiness', color: '#D4A574', base: 50, range: 48 },
    { emoji: '❤️', label: 'Cuddle Score', color: '#FB7185', base: 70, range: 29 },
  ];
  return traits.map((t, i) => {
    const seed = (hash * 31 + i * 17) % t.range;
    const value = Math.min(t.base + seed, 99);
    return { ...t, value };
  });
}

// ═══════════════════════════════════════════════════════
//  CORE FUNNEL COMPONENT — 7 Screens
// ═══════════════════════════════════════════════════════

export default function CoreFunnel() {
  const [screen, setScreen] = useState<ScreenIndex>(0);
  const [pet, setPet] = useState<PetData>({ ...MOCK_PET });
  const [style] = useState<AIStyle>('pixar');
  const [config, setConfig] = useState<ProductConfig>({ ...MOCK_CONFIG });
  const [email, setEmail] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [selectedCostume, setSelectedCostume] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState('');

  // ─── Navigation ───
  const next = useCallback(() => {
    setScreen(s => {
      const nextScreen = Math.min(s + 1, 6) as ScreenIndex;
      // Generate order number when entering checkout
      if (nextScreen === 5 && !orderNumber) {
        setOrderNumber(generateOrderNumber());
      }
      return nextScreen;
    });
  }, [orderNumber]);
  const prev = useCallback(() => setScreen(s => Math.max(s - 1, 0) as ScreenIndex), []);

  // ─── Progress percentage ───
  const progressPct = ((screen + 1) / 7) * 100;

  return (
    <div className="min-h-screen bg-[var(--petgenio-bg)]">
      {/* ─── Top Bar ─── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="max-w-[428px] mx-auto px-4 h-12 flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight" style={{ color: brandColor() }}>
            PetGenio
          </span>
          <div className="flex items-center gap-3">
            {screen > 0 && screen < 6 && (
              <button onClick={prev} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                ← Back
              </button>
            )}
            <span className="text-xs text-muted-foreground">{screen + 1}/7</span>
          </div>
        </div>
        <Progress value={progressPct} className="h-0.5" />
      </header>

      {/* ─── Screen Container ─── */}
      <main className="max-w-[428px] mx-auto px-4 pb-24">
        {screen === 0 && <ScreenHome onNext={next} />}
        {screen === 1 && (
          <ScreenPetProfile
            pet={pet} setPet={setPet} email={email} setEmail={setEmail}
            onNext={next}
          />
        )}
        {screen === 2 && (
          <ScreenCostumeShow
            selectedCostume={selectedCostume} setSelectedCostume={setSelectedCostume}
            onNext={next}
          />
        )}
        {screen === 3 && (
          <ScreenResult
            pet={pet} generating={generating} progress={genProgress}
            setGenerating={setGenerating} setGenProgress={setGenProgress}
            selectedCostume={selectedCostume}
            generatedImage={generatedImage} setGeneratedImage={setGeneratedImage}
            genError={genError} setGenError={setGenError}
            onNext={next}
          />
        )}
        {screen === 4 && (
          <ScreenConfigure
            config={config} setConfig={setConfig} pet={pet}
            onNext={next}
          />
        )}
        {screen === 5 && (
          <ScreenCheckout pet={pet} config={config} style={style}
            onNext={next}
          />
        )}
        {screen === 6 && (
          <ScreenConfirmed petName={pet.name} generatedImage={generatedImage} orderNumber={orderNumber} />
        )}
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  SCREEN 0 — HOME (AI Costume Show Hook — Bento)
// ═══════════════════════════════════════════════════════
function ScreenHome({ onNext }: { onNext: () => void }) {
  return (
    <div className="py-4 space-y-5">
      {/* ── Hero Hook ── */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground leading-tight">
          AI Pet Costume Show
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-[300px] mx-auto">
          Dress up your pet as a king, superhero, or world traveler. Cute, cool, hilarious — you pick!
        </p>
      </div>

      {/* ── Main CTA ── */}
      <Button size="xl" className="w-full text-white text-lg h-14 rounded-2xl font-bold" onClick={onNext}
        style={{ backgroundColor: 'var(--petgenio-teal)' }}>
        Start Dress-Up
      </Button>

      {/* ── Bento Grid Preview (real AI-generated samples) ── */}
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2 row-span-2 rounded-2xl overflow-hidden border border-border min-h-[160px] relative group">
          <img src="/samples/royal.jpg" alt="Royal Portrait" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
            <p className="font-bold text-sm">Royal Portrait</p>
            <p className="text-[11px] opacity-90">Your pet, painted like royalty</p>
          </div>
        </div>
        <div className="rounded-2xl overflow-hidden border border-border aspect-square relative">
          <img src="/samples/beach.jpg" alt="Beach Day" className="w-full h-full object-cover" />
          <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/50 to-transparent">
            <p className="text-[11px] font-medium text-white">Beach</p>
          </div>
        </div>
        <div className="rounded-2xl overflow-hidden border border-border aspect-square relative">
          <img src="/samples/superhero.jpg" alt="Superhero" className="w-full h-full object-cover" />
          <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/50 to-transparent">
            <p className="text-[11px] font-medium text-white">Hero</p>
          </div>
        </div>
        <div className="rounded-2xl overflow-hidden border border-border aspect-square relative">
          <img src="/samples/paris.jpg" alt="Paris Trip" className="w-full h-full object-cover" />
          <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/50 to-transparent">
            <p className="text-[11px] font-medium text-white">Paris</p>
          </div>
        </div>
        <div className="rounded-2xl overflow-hidden border border-border aspect-square relative">
          <img src="/samples/space.jpg" alt="Space Explorer" className="w-full h-full object-cover" />
          <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/50 to-transparent">
            <p className="text-[11px] font-medium text-white">Space</p>
          </div>
        </div>
      </div>

      {/* ── Social Proof ── */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <div className="flex -space-x-2">
          {['🐱', '🐶', '🐰', '🐹'].map((e, i) => (
            <span key={i} className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs border-2 border-white">{e}</span>
          ))}
        </div>
        <span>2,400+ pet parents joined</span>
      </div>

      {/* ── Free Tools (compact) ── */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground text-center">Free Pet Tools</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { emoji: '🎂', label: 'Age Calc' },
            { emoji: '⚖️', label: 'BMI Calc' },
            { emoji: '✨', label: 'Name Gen' },
          ].map(tool => (
            <div key={tool.label} className="p-3 rounded-xl border border-border bg-white text-center">
              <span className="text-lg">{tool.emoji}</span>
              <p className="text-[11px] font-medium text-foreground mt-1">{tool.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Trust Badges ── */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {[
          { icon: '⭐', text: '4.9/5' },
          { icon: '🐾', text: '2,400+ Made' },
          { icon: '🔒', text: 'Secure' },
          { icon: '📦', text: 'Free Ship' },
        ].map(badge => (
          <div key={badge.text} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-border bg-white text-[11px] font-medium text-muted-foreground">
            <span>{badge.icon}</span> {badge.text}
          </div>
        ))}
      </div>

      {/* ── Journal / Blog ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Pet Journal</p>
          <button className="text-xs text-muted-foreground">All articles →</button>
        </div>
        <div className="space-y-2">
          {[
            { cat: 'Expert Guide', title: 'How to Choose the Perfect Plush for Your Pet\'s Personality', excerpt: 'Veterinarian Dr. Sarah Chen shares what makes pets bond with custom toys...', emoji: '🩺' },
            { cat: 'Customer Story', title: 'Luna\'s Royal Portrait Became the Talk of Dog Park', excerpt: 'When Jessica ordered Luna\'s queen plush, she never expected it to go viral...', emoji: '👑' },
            { cat: 'Pet Care', title: '5 Signs Your Pet Loves Their New Toy', excerpt: 'Animal behaviorist explains the body language of happy pets...', emoji: '💡' },
          ].map(article => (
            <div key={article.title} className="p-4 rounded-xl border border-border bg-white text-left space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-lg">{article.emoji}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--petgenio-teal)' }}>{article.cat}</span>
              </div>
              <p className="text-sm font-medium text-foreground leading-snug">{article.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{article.excerpt}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  SCREEN 1 — PET PROFILE (Info + Photo + Email)
// ═══════════════════════════════════════════════════════
function ScreenPetProfile({
  pet, setPet, email, setEmail, onNext,
}: {
  pet: PetData; setPet: (p: PetData) => void;
  email: string; setEmail: (v: string) => void;
  onNext: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="py-6 space-y-5">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-foreground">Tell Us About Your Pet</h2>
        <p className="text-sm text-muted-foreground">Everything we need to create the magic</p>
      </div>

      {/* ── Photo Upload ── */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Pet Photo</label>
        <div className="flex gap-2">
          <Button variant="outline" size="lg" className="flex-1 rounded-xl"
            onClick={() => fileInputRef.current?.click()}>
            📸 Upload Photo
          </Button>
          <Button variant="outline" size="lg" className="rounded-xl"
            onClick={() => cameraInputRef.current?.click()}>
            📷
          </Button>
        </div>
        {/* Hidden file inputs */}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
          onChange={async e => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const compressed = await compressImage(file);
              setPet({ ...pet, photo: compressed });
            } catch {
              // fallback: read raw if compression fails
              const reader = new FileReader();
              reader.onload = () => setPet({ ...pet, photo: reader.result as string });
              reader.readAsDataURL(file);
            }
          }} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={async e => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const compressed = await compressImage(file);
              setPet({ ...pet, photo: compressed });
            } catch {
              const reader = new FileReader();
              reader.onload = () => setPet({ ...pet, photo: reader.result as string });
              reader.readAsDataURL(file);
            }
          }} />
        {pet.photo && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
            <img src={pet.photo} alt="Pet" className="w-14 h-14 rounded-xl object-cover" />
            <div>
              <p className="text-sm font-medium text-foreground">Photo uploaded</p>
              <button onClick={() => setPet({ ...pet, photo: null })} className="text-xs text-muted-foreground underline">Change</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Pet Name ── */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Pet Name</label>
        <input
          value={pet.name} onChange={e => setPet({ ...pet, name: e.target.value })}
          className="w-full h-11 px-4 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="e.g. Mochi"
        />
      </div>

      {/* ── Birthday ── */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Birthday</label>
        <input
          type="date"
          value={pet.birthday} onChange={e => setPet({ ...pet, birthday: e.target.value })}
          className="w-full h-11 px-4 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="text-[11px] text-muted-foreground">Don't remember? Just pick an approximate year</p>
      </div>

      {/* ── Age ── */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Age (years)</label>
        <input
          type="number" min="0" max="30"
          value={pet.age || ''} onChange={e => setPet({ ...pet, age: parseInt(e.target.value) || 0 })}
          className="w-full h-11 px-4 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="e.g. 3"
        />
      </div>

      {/* ── Gender ── */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Gender</label>
        <div className="flex gap-2">
          {(['male', 'female'] as const).map(g => (
            <button key={g} onClick={() => setPet({ ...pet, gender: g })}
              className={cn("flex-1 h-11 rounded-xl border text-sm font-medium transition-all",
                pet.gender === g ? "border-primary bg-primary/10 text-foreground" : "border-border bg-white text-muted-foreground"
              )}>
              {g === 'male' ? '♂ Boy' : '♀ Girl'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Email ── */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Your Email</label>
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          className="w-full h-11 px-4 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="your@email.com"
        />
        <p className="text-[11px] text-muted-foreground">We'll send your costume photos here</p>
      </div>

      {/* ── CTA ── */}
      <Button size="xl" className="w-full text-white text-base h-12 rounded-2xl font-bold"
        onClick={onNext} disabled={!pet.photo || !pet.name}>
        Go to Costume Show →
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  SCREEN 2 — COSTUME SHOW (Templates + Community + Share)
// ═══════════════════════════════════════════════════════
function ScreenCostumeShow({
  selectedCostume, setSelectedCostume, onNext,
}: {
  selectedCostume: string | null; setSelectedCostume: (c: string | null) => void; onNext: () => void;
}) {
  const [customRequest, setCustomRequest] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  const handleRequest = () => {
    if (!customRequest.trim()) return;
    setRequestSubmitted(true);
    setCustomRequest('');
    setTimeout(() => setRequestSubmitted(false), 4000);
  };

  return (
    <div className="py-6 space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-foreground">Choose a Costume</h2>
        <p className="text-sm text-muted-foreground">Pick a theme and watch the magic happen</p>
      </div>

      {/* ── Template Grid (real AI sample photos) ── */}
      <div className="grid grid-cols-2 gap-3">
        {COSTUME_TEMPLATES.map(tpl => (
          <button key={tpl.id} onClick={() => setSelectedCostume(tpl.id)}
            className={cn(
              "relative rounded-2xl overflow-hidden text-left transition-all aspect-[3/4]",
              selectedCostume === tpl.id
                ? "ring-2 shadow-lg scale-[1.02]"
                : "ring-1 ring-border hover:ring-muted-foreground/40 hover:shadow-md"
            )}
            style={selectedCostume === tpl.id ? { boxShadow: `0 4px 20px ${tpl.color}40` } : undefined}
          >
            <img src={tpl.sample} alt={tpl.title} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            {selectedCostume === tpl.id && (
              <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: tpl.color }}>
                ✓
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="font-semibold text-white text-sm">{tpl.title}</p>
              <p className="text-[11px] text-white/80 mt-0.5">{tpl.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ── Community Examples ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Community Favorites</p>
          <button className="text-xs text-muted-foreground">See all →</button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
          {[
            { img: '/samples/comm-luna-queen.jpg', label: 'Luna as Queen' },
            { img: '/samples/comm-max-hero.jpg', label: 'Max the Hero' },
            { img: '/samples/comm-mochi-beach.jpg', label: 'Mochi on Beach' },
            { img: '/samples/comm-buddy-space.jpg', label: 'Buddy in Space' },
          ].map((item, i) => (
            <div key={i} className="shrink-0 w-[120px] snap-start rounded-xl border border-border bg-white overflow-hidden">
              <div className="h-24 overflow-hidden">
                <img src={item.img} alt={item.label} className="w-full h-full object-cover" />
              </div>
              <p className="text-[11px] font-medium text-foreground p-2 text-center">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Custom Template Request ── */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground text-center">Don't see your idea?</p>
        <div className="flex gap-2">
          <input
            value={customRequest}
            onChange={e => setCustomRequest(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleRequest(); }}
            placeholder="e.g. Samurai, Harry Potter, Sushi Chef..."
            className="flex-1 h-11 px-4 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button variant="outline" className="shrink-0 rounded-xl"
            onClick={handleRequest} disabled={!customRequest.trim() || requestSubmitted}>
            {requestSubmitted ? '✓' : 'Request'}
          </Button>
        </div>
        {requestSubmitted ? (
          <p className="text-[11px] text-[#0D9488] font-medium text-center">
            Got it! We'll work on "{customRequest || 'your idea'}" and notify you within 24hrs 🎨
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground text-center">We'll build it and notify you — usually within 24hrs</p>
        )}
      </div>

      {/* ── CTA ── */}
      <div className="space-y-2">
        <Button size="xl" className="w-full text-white text-base h-12 rounded-2xl font-bold"
          onClick={onNext} disabled={!selectedCostume}>
          Generate My Costume →
        </Button>
        <p className="text-center text-xs text-muted-foreground">Free to try · No account needed</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  SCREEN 3 — RESULT (AI Generation + Personality)
// ═══════════════════════════════════════════════════════
function ScreenResult({
  pet, generating, progress,
  setGenerating, setGenProgress,
  selectedCostume, generatedImage, setGeneratedImage, genError, setGenError,
  onNext,
}: {
  pet: PetData; generating: boolean; progress: number;
  setGenerating: (v: boolean) => void; setGenProgress: (v: number | ((p: number) => number)) => void;
  selectedCostume: string | null;
  generatedImage: string | null; setGeneratedImage: (v: string | null) => void;
  genError: string | null; setGenError: (v: string | null) => void;
  onNext: () => void;
}) {
  const costumeName = COSTUME_TEMPLATES.find(t => t.id === selectedCostume)?.title
    || COSTUME_TEMPLATES.find(t => t.id === 'royal')?.title || 'Costume';

  // ─── Call AI generation API ───
  const hasGenerated = useRef(false);
  useEffect(() => {
    if (hasGenerated.current) return;
    hasGenerated.current = true;

    setGenerating(true);
    setGenError(null);
    setGenProgress(0);

    // Indeterminate progress (real API time is unpredictable)
    const interval = setInterval(() => {
      setGenProgress(p => Math.min(p + 1, 95)); // cap at 95% until API returns
    }, 300);

    fetch('/api/generate-costume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photo: pet.photo || undefined,
        costumeId: selectedCostume || 'royal',
        petName: pet.name,
        breed: pet.breed,
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Generation failed');
        return data;
      })
      .then((data) => {
        clearInterval(interval);
        setGenProgress(100);

        if (data.imageBase64) {
          setGeneratedImage(`data:image/png;base64,${data.imageBase64}`);
        } else if (data.imageUrl) {
          setGeneratedImage(data.imageUrl);
        } else if (data.placeholder) {
          // API not configured — show prompt preview
          setGenError('API not configured yet. Showing preview mode.');
          setGeneratedImage(null);
        }

        setTimeout(() => setGenerating(false), 300);
      })
      .catch((err) => {
        clearInterval(interval);
        setGenProgress(0);
        setGenerating(false);
        setGenError(err.message || 'Something went wrong');
      });

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="py-6 space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-foreground">Your Pet's Costume</h2>
        <p className="text-sm text-muted-foreground">{pet.name}'s AI-generated look</p>
      </div>

      {generating ? (
        <div className="space-y-6 text-center py-8">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-secondary" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent animate-spin"
              style={{ borderTopColor: 'var(--petgenio-teal)' }} />
            <span className="absolute inset-0 flex items-center justify-center text-3xl">🎨</span>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-foreground">Creating {pet.name}'s costume...</p>
            <Progress value={progress} className="max-w-[200px] mx-auto" />
            <p className="text-xs text-muted-foreground">{Math.min(progress, 100)}% — adding the finishing touches</p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Generated Costume Preview */}
          <Card className="border-0 shadow-xl overflow-hidden">
            <div className="h-1.5" style={{ backgroundColor: 'var(--petgenio-teal)' }} />
            <CardContent className="p-5 space-y-3">
              {generatedImage ? (
                <div className="space-y-3">
                  <div className="relative aspect-square rounded-2xl overflow-hidden shadow-md">
                    <img
                      src={generatedImage}
                      alt={`${pet.name}'s ${costumeName} costume`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold">
                      ✨ AI Generated
                    </div>
                  </div>
                  <p className="font-bold text-foreground text-center text-lg">{pet.name}'s {costumeName}</p>
                </div>
              ) : genError ? (
                <div className="text-center py-8 space-y-3">
                  <span className="text-5xl block">🎨</span>
                  <p className="text-sm text-muted-foreground">{genError}</p>
                  <p className="font-bold text-foreground text-lg">{pet.name}'s {costumeName}</p>
                  <p className="text-xs text-muted-foreground italic">Preview mode — API not yet configured</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="aspect-square rounded-xl bg-gradient-to-b from-[#F0FDFA] to-[#E6FFFA] flex items-center justify-center">
                    <div className="text-center">
                      <span className="text-7xl block mb-2">🐱</span>
                      <span className="text-4xl">👑</span>
                    </div>
                  </div>
                  <p className="font-bold text-foreground text-center text-lg">{pet.name}'s {costumeName}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Product Mockup Cards (showing costume on products) ── */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground text-center">Put {pet.name} on these →</p>
            <div className="grid grid-cols-3 gap-2">
              {/* Plush Toy */}
              <button onClick={onNext}
                className="group p-2 rounded-2xl border-2 border-border bg-white text-center transition-all hover:shadow-lg hover:scale-[1.03] hover:border-[var(--petgenio-teal)]/40">
                <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-2 bg-gradient-to-b from-[#F0FDFA] to-[#E6FFFA]">
                  {generatedImage ? (
                    <>
                      <img src={generatedImage} alt="Plush" className="absolute inset-0 w-full h-full object-cover rounded-xl" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0D9488]/20 to-transparent" />
                      <div className="absolute inset-0 rounded-xl shadow-inner" style={{ boxShadow: 'inset 0 0 20px rgba(13,148,136,0.15)' }} />
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full"><span className="text-4xl">🧸</span></div>
                  )}
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-bold text-white bg-black/40 px-1.5 py-0.5 rounded-full backdrop-blur-sm">PLUSH</span>
                </div>
                <p className="font-semibold text-foreground text-xs">Plush Toy</p>
                <p className="text-[10px] text-muted-foreground">From $99</p>
              </button>
              {/* Phone Case */}
              <button onClick={onNext}
                className="group p-2 rounded-2xl border-2 border-border bg-white text-center transition-all hover:shadow-lg hover:scale-[1.03] hover:border-[var(--petgenio-teal)]/40">
                <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-2 bg-gradient-to-b from-[#E6FFFA] to-[#F0FDFA] flex items-center justify-center">
                  {generatedImage ? (
                    <div className="relative w-[60%] h-[85%] rounded-[10px] overflow-hidden ring-2 ring-gray-800 shadow-lg">
                      <img src={generatedImage} alt="Phone Case" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-gray-800 rounded-b-lg" />
                    </div>
                  ) : (
                    <span className="text-4xl">📱</span>
                  )}
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-bold text-white bg-black/40 px-1.5 py-0.5 rounded-full backdrop-blur-sm">CASE</span>
                </div>
                <p className="font-semibold text-foreground text-xs">Phone Case</p>
                <p className="text-[10px] text-muted-foreground">From $39</p>
              </button>
              {/* Key Charm */}
              <button onClick={onNext}
                className="group p-2 rounded-2xl border-2 border-border bg-white text-center transition-all hover:shadow-lg hover:scale-[1.03] hover:border-[var(--petgenio-teal)]/40">
                <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-2 bg-gradient-to-b from-[#FFF1F2] to-[#F0FDFA] flex items-center justify-center">
                  {generatedImage ? (
                    <div className="relative flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full border-2 border-gray-400 mb-[-2px] z-10" />
                      <div className="w-[55%] aspect-square rounded-full overflow-hidden ring-2 ring-gray-300 shadow-md">
                        <img src={generatedImage} alt="Key Charm" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  ) : (
                    <span className="text-4xl">🔑</span>
                  )}
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-bold text-white bg-black/40 px-1.5 py-0.5 rounded-full backdrop-blur-sm">CHARM</span>
                </div>
                <p className="font-semibold text-foreground text-xs">Key Charm</p>
                <p className="text-[10px] text-muted-foreground">From $29</p>
              </button>
            </div>
          </div>

          {/* ── Visual Personality Traits (Behance-style) ── */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground text-center">{pet.name}'s Character</p>
            <div className="grid grid-cols-2 gap-2">
              {generateTraits(pet.name).map(trait => (
                <div key={trait.label} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-border">
                  <span className="text-2xl">{trait.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-muted-foreground">{trait.label}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${trait.value}%`, backgroundColor: trait.color }} />
                      </div>
                      <span className="text-xs font-bold text-foreground">{trait.value}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button size="xl" className="w-full text-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow"
            style={{ backgroundColor: 'var(--petgenio-teal)' }} onClick={onNext}>
            Get {pet.name}'s Merch →
          </Button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  SCREEN 4 — CONFIGURE (Product Selection + Options)
// ═══════════════════════════════════════════════════════
function ScreenConfigure({
  config, setConfig, pet, onNext,
}: {
  config: ProductConfig; setConfig: (c: ProductConfig) => void;
  pet: PetData; onNext: () => void;
}) {
  const [selectedProduct, setSelectedProduct] = useState<'plush' | 'phone-case' | 'keychain' | null>(null);

  const PRODUCT_PRICE: Record<string, number> = {
    'plush': 99, 'phone-case': 39, 'keychain': 29,
  };

  return (
    <div className="py-6 space-y-5">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-bold text-foreground">Choose Your Product</h2>
        <p className="text-xs text-muted-foreground">{pet.name}'s costume on any product</p>
      </div>

      {/* ── Product Selection Grid ── */}
      {!selectedProduct ? (
        <div className="space-y-3">
          {[
            { id: 'plush' as const, emoji: '🧸', title: 'Custom Plush Toy', desc: 'Soft, huggable, one-of-a-kind', price: '$99', gradient: 'from-[#F0FDFA] to-[#E6FFFA]' },
            { id: 'phone-case' as const, emoji: '📱', title: 'Phone Case', desc: 'Daily carry your cutie', price: '$39', gradient: 'from-[#E6FFFA] to-[#F0FDFA]' },
            { id: 'keychain' as const, emoji: '🔑', title: 'Key Charm', desc: 'Mini plush Labubu-style', price: '$29', gradient: 'from-[#FFF1F2] to-[#F0FDFA]' },
          ].map(product => (
            <button key={product.id} onClick={() => setSelectedProduct(product.id)}
              className="w-full p-4 rounded-2xl border-2 border-border bg-white text-left flex items-center gap-4 hover:shadow-md transition-all">
              <div className={cn("w-20 h-20 rounded-xl bg-gradient-to-b flex items-center justify-center shrink-0", product.gradient)}>
                <span className="text-4xl">{product.emoji}</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{product.title}</p>
                <p className="text-xs text-muted-foreground">{product.desc}</p>
              </div>
              <p className="font-bold text-foreground">{product.price}</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {/* Selected product header */}
          <div className="flex items-center justify-between">
            <button onClick={() => setSelectedProduct(null)} className="text-sm text-muted-foreground hover:text-foreground">
              ← Change product
            </button>
            <p className="text-lg font-bold text-foreground">${PRODUCT_PRICE[selectedProduct]}</p>
          </div>

          {/* ── Plush-specific options ── */}
          {selectedProduct === 'plush' && (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Softness</p>
                <div className="grid grid-cols-3 gap-2">
                  {SOFTNESS_OPTIONS.map(opt => (
                    <button key={opt.id} onClick={() => setConfig({ ...config, softness: opt.id })}
                      className={cn("p-3 rounded-xl border text-center transition-all",
                        config.softness === opt.id ? "border-primary bg-primary/5" : "border-border bg-white"
                      )}>
                      <span className="text-xl">{opt.emoji}</span>
                      <p className="text-xs font-medium text-foreground mt-1">{opt.label}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Size</p>
                <div className="grid grid-cols-3 gap-2">
                  {SIZE_OPTIONS.map(opt => (
                    <button key={opt.id} onClick={() => setConfig({ ...config, size: opt.id })}
                      className={cn("p-3 rounded-xl border text-center transition-all",
                        config.size === opt.id ? "border-primary bg-primary/5" : "border-border bg-white"
                      )}>
                      <p className="text-lg font-bold text-foreground">{opt.inch}</p>
                      <p className="text-xs text-muted-foreground">{opt.label}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Scent</p>
                <div className="grid grid-cols-3 gap-2">
                  {SCENT_OPTIONS.map(opt => (
                    <button key={opt.id} onClick={() => setConfig({ ...config, scent: opt.id })}
                      className={cn("p-3 rounded-xl border text-center transition-all",
                        config.scent === opt.id ? "border-primary bg-primary/5" : "border-border bg-white"
                      )}>
                      <span className="text-xl">{opt.emoji}</span>
                      <p className="text-xs font-medium text-foreground mt-1">{opt.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Phone Case options ── */}
          {selectedProduct === 'phone-case' && (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Material</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'silicone', label: 'Silicone', emoji: '🔹' },
                    { id: 'hard', label: 'Hard Shell', emoji: '🔷' },
                  ].map(opt => (
                    <button key={opt.id}
                      className="p-3 rounded-xl border border-border bg-white text-center">
                      <span className="text-xl">{opt.emoji}</span>
                      <p className="text-xs font-medium text-foreground mt-1">{opt.label}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Your Phone Model</p>
                <select className="w-full h-11 px-4 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option>iPhone 16 Pro</option>
                  <option>iPhone 16</option>
                  <option>iPhone 15 Pro</option>
                  <option>Samsung S25</option>
                  <option>Other</option>
                </select>
              </div>
            </>
          )}

          {/* ── Keychain options ── */}
          {selectedProduct === 'keychain' && (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Size</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'small', label: 'Mini (3")', emoji: '🔑' },
                    { id: 'medium', label: 'Regular (5")', emoji: '🎀' },
                  ].map(opt => (
                    <button key={opt.id}
                      className="p-3 rounded-xl border border-border bg-white text-center">
                      <span className="text-xl">{opt.emoji}</span>
                      <p className="text-xs font-medium text-foreground mt-1">{opt.label}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Attachment</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'ring', label: 'Key Ring', emoji: '⭕' },
                    { id: 'clip', label: 'Clip', emoji: '📎' },
                    { id: 'chain', label: 'Chain', emoji: '⛓️' },
                  ].map(opt => (
                    <button key={opt.id}
                      className="p-3 rounded-xl border border-border bg-white text-center">
                      <span className="text-xl">{opt.emoji}</span>
                      <p className="text-[11px] font-medium text-foreground mt-1">{opt.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Gift Box (shared) */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Gift Box</p>
            <div className="flex gap-3">
              {BOX_COLORS.map(opt => (
                <button key={opt.id} onClick={() => setConfig({ ...config, boxColor: opt.id })}
                  className={cn("flex-1 p-3 rounded-xl border text-center transition-all",
                    config.boxColor === opt.id ? "border-2 shadow-sm" : "border-border"
                  )}
                  style={config.boxColor === opt.id ? { borderColor: opt.hex } : undefined}>
                  <div className="w-8 h-8 rounded-full mx-auto border border-border/50"
                    style={{ backgroundColor: opt.hex }} />
                  <p className="text-[10px] text-muted-foreground mt-1">{opt.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* CTA */}
          <Button size="xl" className="w-full text-white rounded-2xl"
            style={{ backgroundColor: 'var(--petgenio-teal)' }} onClick={onNext}>
            Checkout — ${PRODUCT_PRICE[selectedProduct]} →
          </Button>
          <p className="text-center text-xs text-muted-foreground">Free shipping · 14-day happiness guarantee</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  SCREEN 5 — CHECKOUT (One-Tap Payment)
// ═══════════════════════════════════════════════════════
function ScreenCheckout({
  pet, config, style, onNext,
}: {
  pet: PetData; config: ProductConfig; style: AIStyle;
  onNext: () => void;
}) {
  const [paying, setPaying] = useState(false);

  const handlePay = () => {
    setPaying(true);
    setTimeout(() => { setPaying(false); onNext(); }, 1500);
  };

  return (
    <div className="py-6 space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-foreground">Almost Yours!</h2>
        <p className="text-sm text-muted-foreground">Review your order</p>
      </div>

      {/* Order Summary */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center text-3xl">🧸</div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{pet.name}'s Custom Plush</p>
              <p className="text-xs text-muted-foreground">
                {STYLE_OPTIONS.find(s => s.id === style)?.name} · {SIZE_OPTIONS.find(s => s.id === config.size)?.label}
              </p>
            </div>
            <p className="font-bold text-foreground text-lg">$99</p>
          </div>

          <div className="border-t border-border" />

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Softness</p>
              <p className="font-medium text-foreground">
                {SOFTNESS_OPTIONS.find(s => s.id === config.softness)?.emoji} {SOFTNESS_OPTIONS.find(s => s.id === config.softness)?.label}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Scent</p>
              <p className="font-medium text-foreground">
                {SCENT_OPTIONS.find(s => s.id === config.scent)?.emoji} {SCENT_OPTIONS.find(s => s.id === config.scent)?.label}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Gift Box</p>
              <p className="font-medium text-foreground">
                {BOX_COLORS.find(b => b.id === config.boxColor)?.label}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Delivery</p>
              <p className="font-medium text-foreground">{getDeliveryRange()}</p>
            </div>
          </div>

          <div className="border-t border-border" />

          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">$99.00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span className="text-[#0D9488] font-medium">Free</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-1">
              <span className="text-foreground">Total</span>
              <span className="text-foreground">$99.00</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Buttons */}
      <div className="space-y-3">
        <button onClick={handlePay} disabled={paying}
          className="w-full h-14 rounded-2xl bg-black text-white font-semibold text-lg flex items-center justify-center gap-2 hover:bg-black/90 transition-colors disabled:opacity-70">
          {paying ? (
            <span className="animate-pulse">Processing...</span>
          ) : (
            <> Pay with <span className="font-bold">Apple Pay</span></>
          )}
        </button>
        <button onClick={handlePay} disabled={paying}
          className="w-full h-14 rounded-2xl bg-[#FFC439] text-[#003087] font-semibold text-lg flex items-center justify-center gap-2 hover:bg-[#FFC439]/90 transition-colors disabled:opacity-70">
          {paying ? (
            <span className="animate-pulse">Processing...</span>
          ) : (
            <> Pay with <span className="font-bold">PayPal</span></>
          )}
        </button>
      </div>

      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span>🔒 Secure checkout</span>
        <span>📦 Free shipping</span>
        <span>↩️ 14-day guarantee</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  SCREEN 6 — CONFIRMED (Order Confirmation)
// ═══════════════════════════════════════════════════════
function ScreenConfirmed({
  petName, generatedImage, orderNumber,
}: {
  petName: string; generatedImage: string | null; orderNumber: string;
}) {
  const [showConfetti, setShowConfetti] = useState(true);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(t);
  }, []);

  const deliveryRange = getDeliveryRange();

  const handleShare = async () => {
    const shareText = `Check out ${petName}'s AI costume from PetGenio! 🐾✨ #PetGenio #AIPetCostume`;

    // Try Web Share API with image
    if (generatedImage && navigator.share) {
      try {
        const response = await fetch(generatedImage);
        const blob = await response.blob();
        const file = new File([blob], `${petName}-petgenio.jpg`, { type: blob.type });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ text: shareText, files: [file] });
          setShared(true);
          return;
        }
        await navigator.share({ text: shareText });
        setShared(true);
        return;
      } catch { /* user cancelled, fall through */ }
    }

    // Fallback: copy text to clipboard
    try {
      await navigator.clipboard.writeText(shareText);
      setShared(true);
    } catch { /* clipboard failed */ }
  };

  const shareUrls: Record<string, string> = {
    Facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://petgenio-nine.vercel.app')}&quote=${encodeURIComponent(`Check out ${petName}'s AI costume! 🐾✨`)}`,
    X: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out ${petName}'s AI costume from PetGenio! 🐾✨ #PetGenio #AIPetCostume`)}&url=${encodeURIComponent('https://petgenio-nine.vercel.app')}`,
    LinkedIn: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://petgenio-nine.vercel.app')}`,
  };

  const handleSocialClick = (name: string) => {
    const url = shareUrls[name];
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500');
    } else {
      // TikTok / Instagram — no web share URL, use native share or clipboard
      handleShare();
    }
  };

  return (
    <div className="py-10 space-y-8 text-center">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i}
              className="absolute w-2 h-2 rounded-full animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 50}%`,
                backgroundColor: ['#0D9488', '#FB7185', '#D4A574', '#14B8A6', '#134E4A'][i % 5],
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="space-y-3">
        <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center text-4xl">
          ✅
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">You're Amazing!</h2>
          <p className="text-muted-foreground mt-2">Your plush is being crafted with love!</p>
        </div>
      </div>

      <Card className="border-0 shadow-lg text-left">
        <CardContent className="p-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Order #</span>
            <span className="font-medium text-foreground">{orderNumber || generateOrderNumber()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Estimated Delivery</span>
            <span className="font-medium text-foreground">{deliveryRange}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tracking</span>
            <span className="font-medium" style={{ color: 'var(--petgenio-teal)' }}>
              Will be emailed
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="font-semibold text-foreground">What happens next?</h3>
        <div className="space-y-2">
          {[
            { step: '1', text: 'AI generates your unique plush design', time: '24 hours' },
            { step: '2', text: 'Artisan handcrafts the plush', time: '3-5 days' },
            { step: '3', text: 'Quality check + gift box packaging', time: '1 day' },
            { step: '4', text: 'Shipped to your door', time: '3-5 days' },
          ].map(item => (
            <div key={item.step} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-border">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: 'var(--petgenio-teal)' }}>
                {item.step}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-foreground">{item.text}</p>
                <p className="text-xs text-muted-foreground">{item.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Re-engagement Hook ── */}
      <div className="space-y-4">
        <div className="p-5 rounded-2xl border-2 text-left space-y-3"
          style={{ borderColor: 'var(--petgenio-teal)', backgroundColor: 'var(--petgenio-teal)' + '08' }}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎁</span>
            <p className="font-bold text-foreground">Earn Points, Get Free Gifts!</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Share your pet's costume photos on social media and earn points toward free gifts. The more you share, the more you save!
          </p>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Use these tags so fans can find us:</p>
            <div className="flex flex-wrap gap-2">
              {['#PetGenio', '#AIPetCostume', '#PetDressUp'].map(tag => (
                <span key={tag} className="px-2.5 py-1 rounded-full bg-white border border-border text-xs font-medium text-foreground">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            {SOCIAL_LINKS.map(social => (
              <button key={social.name}
                onClick={() => handleSocialClick(social.name)}
                className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-white text-xs font-semibold transition-opacity hover:opacity-80"
                style={{ backgroundColor: social.color }}>
                <span>{social.emoji}</span>
              </button>
            ))}
          </div>
          {shared && (
            <p className="text-[11px] text-[#0D9488] font-medium text-center">
              ✓ Shared! Thanks for spreading the joy!
            </p>
          )}
          <p className="text-[11px] text-muted-foreground text-center">
            10 posts = Free Key Charm · 25 posts = Free Phone Case · Unlimited fun!
          </p>
        </div>

        <Button size="xl" className="w-full text-white rounded-2xl"
          style={{ backgroundColor: 'var(--petgenio-teal)' }}>
          Create More Costumes →
        </Button>
      </div>
    </div>
  );
}
