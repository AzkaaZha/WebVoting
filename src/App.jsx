import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import {
  Award,
  ShieldCheck,
  Users,
  Vote,
  BarChart3,
  LockKeyhole,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  LogOut,
  RefreshCw,
  Trophy,
  Sparkles,
  CircleAlert,
} from "lucide-react";

const ROY_VOTER_NAME = "Roy M. Siagian";
const BEST_EMPLOYEE_CATEGORY = "Best Employee";

const DEMO_PEOPLE = [
  "Roy M. Siagian",
  "Sri Mariati Hutabarat",
  "Hanif Vidi Yuwono",
  "Rosalina A.M. Sihombing",
  "Adie Iwa Chatulistiwa",
  "Muhammad Habibi",
  "Alifuddin Fahmi Abdillah",
  "Allya Hanifa",
  "Alvi Nur Azizah",
  "Andi Suhandi",
  "Angelica Nadya Rizki",
  "Anggun Anggara Kusuma",
  "Annissa Fajar Hermawati",
  "Ari Kusuma",
  "Asep Saepurohman",
  "Dana Pratiwi",
  "Dian Firja Ameliani",
  "Gerhana Rizki Candra Wahyuni",
  "Hanifah Rasyidah Riani",
  "Hans Karunia Hamonangan",
  "Husnul Khatimah AR",
  "Iesa Rochim",
  "Imam Hidayat",
  "Irvanus Destavino",
  "Latoiful Manan",
  "Moh. Mustofa Hadi",
  "Monica Stifani Panjaitan",
  "Muh. Reza Syamsuri",
  "Muhammad Bimo Anugrah Idris",
  "Muhammad Subhan Nurul Umam",
  "Ni Wayan Widnyani",
  "Nistya Maharani",
  "Nyayu Deviana Nur Asyifa",
  "Pramesta Widyapermana",
  "Putri Setya Utami",
  "Raden Sonny Abdurrahman",
  "Rizky Dwi Kusuma",
  "Rokhyudi",
  "Rury Uswatun Hasanah",
  "Saepudin",
  "Septy Haryanti",
  "Sri Nilawati",
  "Umi Khumairoh",
  "Uswatun Khasanah",
  "Yosep Saepulloh",
  "Zul Khoyriah",
  "Satria Abdul Fatah",
  "Bre Ikra Jendra",
];

function Brand({ small = false }) {
  return (
    <div className={`brand brand-logo-only${small ? " brand-small" : ""}`}>
      <img className="brand-logo" src="/logo-bawaslu.png" alt="Logo Bawaslu" />
    </div>
  );
}
function SetupNotice() {
  return (
    <div className="notice">
      <CircleAlert size={18} />
      <div>
        <b>Supabase belum dikonfigurasi</b>
        <p>
          Salin <code>.env.example</code> menjadi <code>.env</code>, lalu isi
          URL dan anon key project Supabase. Panduan ada di README.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("vote");
  const [people, setPeople] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState("");
  const [choices, setChoices] = useState({});
  const [step, setStep] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [session, setSession] = useState(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [stats, setStats] = useState([]);
  const [votingOpen, setVotingOpen] = useState(true);
  const [totalVoters, setTotalVoters] = useState(0);
  const [votedCount, setVotedCount] = useState(0);
  const [revealIndex, setRevealIndex] = useState(0);
  const [winners, setWinners] = useState([]);
  const [resetLoading, setResetLoading] = useState(false);
  const configured = !!supabase;

  useEffect(() => {
    if (!supabase) return;
    loadPublic();
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: auth } = supabase.auth.onAuthStateChange((_e, s) =>
      setSession(s),
    );
    return () => auth.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (session) {
      loadAdmin();
    }
  }, [session]);
  async function loadPublic() {
    const [{ data: p, error: pe }, { data: c, error: ce }, { data: settings }] =
      await Promise.all([
        supabase
          .from("people")
          .select("id,full_name")
          .eq("is_active", true)
          .order("full_name"),
        supabase
          .from("categories")
          .select("id,name,sort_order")
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("app_settings")
          .select("voting_open")
          .eq("id", true)
          .maybeSingle(),
      ]);
    if (pe || ce) {
      setMessage(pe?.message || ce?.message);
      return;
    }
    setPeople(p || []);
    setCategories(c || []);
    if (settings) setVotingOpen(settings.voting_open);
  }
  async function loadAdmin() {
    const { data: isAdmin, error: adminCheckError } =
      await supabase.rpc("is_awards_admin");
    if (adminCheckError || !isAdmin) {
      setMessage(
        "Akun ini belum diberikan akses admin. Tambahkan UUID akun ke tabel admin_users di Supabase.",
      );
      await supabase.auth.signOut();
      setSession(null);
      return;
    }
    const [
      { data: p },
      { data: v },
      { data: c },
      { data: w },
      { data: settings },
    ] = await Promise.all([
      supabase
        .from("people")
        .select("id,full_name,submitted_at")
        .eq("is_active", true)
        .order("full_name"),
      supabase.from("votes").select("category_id,candidate_id"),
      supabase
        .from("categories")
        .select("id,name,sort_order")
        .eq("is_active", true)
        .order("sort_order"),
      supabase.from("winners").select("category_id,candidate_id,is_published"),
      supabase
        .from("app_settings")
        .select("voting_open")
        .eq("id", true)
        .maybeSingle(),
    ]);
    if (settings) setVotingOpen(settings.voting_open);
    setTotalVoters(p?.length || 0);
    setVotedCount(p?.filter((x) => x.submitted_at).length || 0);
    setCategories(c || []);
    setWinners(w || []);
    const grouped = (c || []).map((cat) => {
      const tally = {};
      (v || [])
        .filter((x) => x.category_id === cat.id)
        .forEach(
          (x) => (tally[x.candidate_id] = (tally[x.candidate_id] || 0) + 1),
        );
      return {
        ...cat,
        tally,
        total: Object.values(tally).reduce((a, b) => a + b, 0),
        rank: Object.entries(tally).sort((a, b) => b[1] - a[1]),
      };
    });
    setStats(grouped);


  }

  async function handleResetVoting() {
    if (!session || resetLoading) return;

    const confirmReset = window.confirm(
      "PERINGATAN!\n\n" +
        "Seluruh suara dan data pemenang akan dihapus.\n" +
        "Daftar pemilih dan kategori tetap dipertahankan.\n" +
        "Voting akan ditutup setelah reset.\n\n" +
        "Apakah kamu yakin ingin melanjutkan?",
    );
    if (!confirmReset) return;

    const confirmation = window.prompt(
      'Ketik "RESET VOTING" untuk melanjutkan:',
    );
    if (confirmation !== "RESET VOTING") {
      window.alert("Reset dibatalkan. Tidak ada data yang diubah.");
      return;
    }

    try {
      setResetLoading(true);
      setMessage("");
      const { data, error } = await supabase.rpc("admin_reset_voting");
      if (error) throw error;

      window.alert(
        "Reset voting berhasil.\n\n" +
          `Suara dihapus: ${data?.deleted_votes ?? 0}\n` +
          `Data pemenang dihapus: ${data?.deleted_winners ?? 0}\n` +
          `Status pemilih direset: ${data?.reset_people ?? 0}\n\n` +
          "Voting sekarang dalam keadaan tertutup.",
      );
      setSelectedPerson("");
      setChoices({});
      setStep(-1);
      setSubmitted(false);
      await loadPublic();
      await loadAdmin();
    } catch (error) {
      console.error("Reset voting error:", error);
      window.alert("Reset voting gagal: " + (error?.message || "Terjadi kesalahan."));
    } finally {
      setResetLoading(false);
    }
  }

  useEffect(() => {
    if (!session || !supabase) return;
    const channel = supabase
      .channel("admin-votes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "votes" },
        () => loadAdmin(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "people" },
        () => loadAdmin(),
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [session]);

  // Enam kategori umum diisi semua pemilih. Best Employee hanya untuk Roy.
  const selectedVoter = people.find((p) => p.id === selectedPerson);
  const isRoyVoter = selectedVoter?.full_name?.trim().toLowerCase() === ROY_VOTER_NAME.toLowerCase();
  const voterCategories = categories.filter(
    (category) => category.name !== BEST_EMPLOYEE_CATEGORY || isRoyVoter,
  );
  const totalVoterCategories = voterCategories.length;
  const currentCategory = step >= 0 ? voterCategories[step] : null;

  function startVoting() {
    if (!selectedPerson) {
      setMessage("Silakan pilih nama kamu terlebih dahulu.");
      return;
    }
    if (!votingOpen) {
      setMessage("Voting sedang ditutup oleh admin.");
      return;
    }
    if (people.find((p) => p.id === selectedPerson)?.submitted_at) {
      setMessage("Nama ini sudah mengirimkan suara.");
      return;
    }
    setChoices({});
    setMessage("");
    setStep(0);
  }

  async function submitBallot() {
    if (step !== totalVoterCategories) {
      setMessage(
        "Selesaikan seluruh kategori dan tinjau pilihan sebelum mengirim.",
      );
      return;
    }
    if (!selectedPerson) {
      setMessage("Pilih nama kamu terlebih dahulu.");
      setPage("vote");
      setStep(-1);
      return;
    }
    if (categories.length !== 7 || totalVoterCategories !== (isRoyVoter ? 7 : 6)) {
      setMessage("Data kategori belum sesuai konfigurasi terbaru. Hubungi admin.");
      return;
    }
    if (voterCategories.some((c) => !choices[c.id])) {
      setMessage("Lengkapi pilihan pada seluruh kategori.");
      setPage("vote");
      return;
    }
    setBusy(true);
    setMessage("");
    const selections = voterCategories.map((c) => ({
      category_id: c.id,
      candidate_id: choices[c.id],
    }));
    const { error } = await supabase.rpc("submit_ballot", {
      p_person_id: selectedPerson,
      p_selections: selections,
    });
    setBusy(false);
    if (error) {
      setMessage(
        error.message.includes("already")
          ? "Nama ini sudah mengirimkan suara."
          : error.message,
      );
      return;
    }
    setSubmitted(true);
  }
  async function login(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    });
    setBusy(false);
    if (error) setMessage(error.message);
  }
  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
    setPage("vote");
  }
  async function toggleVoting() {
    const next = !votingOpen;
    const { error } = await supabase
      .from("app_settings")
      .update({ voting_open: next, updated_at: new Date().toISOString() })
      .eq("id", true);
    if (error) {
      setMessage(error.message);
      return;
    }
    setVotingOpen(next);
  }
  async function publishWinner(cat) {
    const row = stats.find((x) => x.id === cat.id);
    if (!row?.rank?.length) return;
    const top = row.rank[0];
    const tied = row.rank.filter((x) => x[1] === top[1]);
    if (tied.length > 1) {
      setMessage(
        "Kategori ini seri. Tentukan mekanisme pemecah seri terlebih dahulu.",
      );
      return;
    }
    const { error } = await supabase
      .from("winners")
      .upsert(
        {
          category_id: cat.id,
          candidate_id: top[0],
          is_published: true,
          published_at: new Date().toISOString(),
        },
        { onConflict: "category_id" },
      );
    if (error) {
      setMessage(error.message);
      return;
    }
    loadAdmin();
  }
  async function unpublishWinner(cat) {
    const { error } = await supabase
      .from("winners")
      .update({ is_published: false })
      .eq("category_id", cat.id);
    if (error) setMessage(error.message);
    loadAdmin();
  }
  const published = useMemo(
    () =>
      categories
        .map((c) => ({
          ...c,
          winner: winners.find((w) => w.category_id === c.id && w.is_published),
        }))
        .filter((c) => c.winner),
    [categories, winners],
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <Brand />
        <nav>
          <button
            className={page === "vote" ? "nav-active" : ""}
            onClick={() => {
              setPage("vote");
              setMessage("");
            }}
          >
            <Vote size={16} /> Voting
          </button>
          <button
            className={page === "winners" ? "nav-active" : ""}
            onClick={() => setPage("winners")}
          >
            <Trophy size={16} /> Pemenang
          </button>
          <button
            className={page === "admin" ? "nav-active" : ""}
            onClick={() => setPage("admin")}
          >
            <LockKeyhole size={16} /> Admin
          </button>
        </nav>
      </header>
      {!configured && (
        <main className="container">
          <SetupNotice />
        </main>
      )}
      {page === "vote" && (
        <main className="container">
          <section className="hero">
            <div className="hero-copy">
              <div className="eyebrow">
                <Sparkles size={14} /> APRESIASI & KEBERSAMAAN
              </div>
              <h1>
                Setiap orang punya
                <br />
                <em>cerita istimewa.</em>
              </h1>
              <p>
                Ruang apresiasi dan kebersamaan keluarga besar Bawaslu
                Puslitbangdiklat.
              </p>
              <div className="hero-meta">
                <span>
                  <Users size={15} /> {people.length || 48} kandidat
                </span>
                <span>
                  <Award size={15} /> 7 kategori
                </span>
              </div>
            </div>
            <div className="hero-art">
              <div className="sunburst">✦</div>
              <div className="trophy-circle">
                <Trophy size={74} />
              </div>
              <div className="hero-ribbon">PUSLITBANGDIKLAT</div>
            </div>
          </section>
          {!votingOpen && !submitted ? (
            <div className="notice">
              <LockKeyhole size={18} />
              <div>
                <b>Voting sedang ditutup</b>
                <p>
                  Periode pengisian suara belum dibuka atau sudah ditutup oleh
                  admin.
                </p>
              </div>
            </div>
          ) : null}
          {submitted ? (
            <section className="success-card">
              <div className="success-icon">
                <CheckCircle2 size={42} />
              </div>
              <h2>Suaramu berhasil direkam!</h2>
              <p>
                Terima kasih sudah berpartisipasi dalam kegiatan Bawaslu
                Puslitbangdiklat. Hasil voting akan diumumkan oleh panitia.
              </p>
              <Brand />
            </section>
          ) : (
            <section
              className="vote-panel"
              style={!votingOpen ? { opacity: 0.5, pointerEvents: "none" } : {}}
            >
              <div className="section-heading">
                <div>
                  <div className="eyebrow red">FORMULIR VOTING</div>
                  <h2>
                    {step === -1
                      ? "Mulai dari identitasmu"
                      : "Tentukan pilihanmu"}
                  </h2>
                  <p>
                    {step === -1
                      ? "Pilih nama kamu terlebih dahulu. Setelah itu, kamu akan masuk ke kategori voting."
                      : "Pilih satu orang untuk setiap kategori. Kamu hanya dapat mengirimkan suara satu kali."}
                  </p>
                </div>
                <div className="step-count">
                  <b>
                    {step === -1 ? "00" : String(step + 1).padStart(2, "0")}
                  </b>
                  <span>/ {String(step === -1 ? 7 : totalVoterCategories || 7).padStart(2, "0")}</span>
                </div>
              </div>
              <div className="progress-track">
                <div
                  style={{ width: `${step < 0 ? 0 : ((step + 1) / Math.max(totalVoterCategories, 1)) * 100}%` }}
                />
              </div>

              {step === -1 ? (
                <div className="voter-field identity-step">
                  <label>Nama pemilih</label>
                  <select
                    value={selectedPerson}
                    onChange={(e) => {
                      setSelectedPerson(e.target.value);
                      setChoices({});
                      setStep(-1);
                      setMessage("");
                    }}
                  >
                    <option value="">Pilih nama kamu...</option>
                    {people.map((p) => (
                      <option value={p.id} key={p.id}>
                        {p.full_name}
                      </option>
                    ))}
                  </select>
                  <small>
                    Gunakan nama sendiri. Satu nama hanya dapat mengirim satu
                    paket suara. Best Employee hanya dapat diisi oleh Roy M. Siagian.
                  </small>
                  {message && <p className="error-text">{message}</p>}
                  <div className="identity-action">
                    <button
                      className="btn primary"
                      disabled={!selectedPerson || !votingOpen}
                      onClick={startVoting}
                    >
                      Mulai Voting <ChevronRight size={17} />
                    </button>
                  </div>
                </div>
              ) : step >= 0 && step < totalVoterCategories && currentCategory ? (
                <>
                  <div className="voter-summary">
                    <span>PEMILIH</span>
                    <b>
                      {people.find((p) => p.id === selectedPerson)?.full_name}
                    </b>
                    <button type="button" onClick={() => setStep(-1)}>
                      Ganti nama
                    </button>
                  </div>
                  <div className="category-block">
                    <div className="category-number">
                      KATEGORI {String(step + 1).padStart(2, "0")}
                    </div>
                    <h3>{currentCategory.name}</h3>
                    <p>
                      Pilih satu rekan yang paling sesuai dengan kategori ini.
                    </p>
                    <div className="candidate-grid">
                      {people.map((p, i) => (
                        <button
                          key={p.id}
                          className={`candidate ${choices[currentCategory.id] === p.id ? "chosen" : ""}`}
                          onClick={() => {
                            setChoices({
                              ...choices,
                              [currentCategory.id]: p.id,
                            });
                            setMessage("");
                          }}
                        >
                          <span className="avatar">
                            {p.full_name
                              .split(" ")
                              .slice(0, 2)
                              .map((x) => x[0])
                              .join("")
                              .toUpperCase()}
                          </span>
                          <span className="candidate-name">{p.full_name}</span>
                          <span className="radio-dot">
                            {choices[currentCategory.id] === p.id && <i />}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {message && <p className="error-text">{message}</p>}
                </>
              ) : step === totalVoterCategories ? (
                <div className="empty-state">
                  <CheckCircle2 size={32} />
                  <h3>Seluruh kategori selesai</h3>
                  <p>Lanjutkan untuk memeriksa {totalVoterCategories} pilihanmu.</p>
                  <button
                    className="btn primary"
                    onClick={() => setPage("review")}
                  >
                    Tinjau pilihan <ChevronRight size={17} />
                  </button>
                </div>
              ) : (
                <div className="empty-state">Memuat kategori voting...</div>
              )}

              {step >= 0 && step < totalVoterCategories && (
                <div className="form-footer">
                  <span>
                    {voterCategories.filter((c) => choices[c.id]).length} dari {totalVoterCategories} kategori terisi
                  </span>
                  <div className="actions">
                    <button
                      className="btn secondary"
                      disabled={step === 0}
                      onClick={() => setStep(step - 1)}
                    >
                      <ChevronLeft size={17} /> Sebelumnya
                    </button>
                    {step < totalVoterCategories - 1 ? (
                      <button
                        className="btn primary"
                        disabled={
                          !currentCategory || !choices[currentCategory.id]
                        }
                        onClick={() => setStep(step + 1)}
                      >
                        Selanjutnya <ChevronRight size={17} />
                      </button>
                    ) : (
                      <button
                        className="btn primary"
                        disabled={
                          !currentCategory || !choices[currentCategory.id]
                        }
                        onClick={() => setStep(totalVoterCategories)}
                      >
                        Tinjau pilihan <ChevronRight size={17} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}
        </main>
      )}
      {page === "review" && (
        <main className="container narrow">
          <button
            className="back-link"
            onClick={() => {
              setPage("vote");
              setStep(Math.max(voterCategories.length - 1, 0));
            }}
          >
            <ChevronLeft size={16} /> Kembali ke voting
          </button>
          <section className="vote-panel">
            <div className="eyebrow red">LANGKAH TERAKHIR</div>
            <h2>Periksa pilihanmu</h2>
            <p>Pastikan semua pilihan sudah benar sebelum dikirim. {isRoyVoter ? "Kamu mengisi 7 kategori termasuk Best Employee." : "Kamu mengisi 6 kategori; Best Employee khusus untuk Roy M. Siagian."}</p>
            <div className="review-list">
              {voterCategories.map((c, i) => (
                <div className="review-row" key={c.id}>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <b>{c.name}</b>
                    <small>
                      {people.find((p) => p.id === choices[c.id])?.full_name ||
                        "Belum dipilih"}
                    </small>
                  </div>
                </div>
              ))}
            </div>
            <div className="voter-field">
              <label>Nama pemilih</label>
              <b>
                {people.find((p) => p.id === selectedPerson)?.full_name ||
                  "Belum dipilih"}
              </b>
            </div>
            {message && <p className="error-text">{message}</p>}
            <button
              className="btn primary full"
              disabled={
                busy ||
                !configured ||
                !selectedPerson ||
                categories.length !== 7 ||
                voterCategories.some((c) => !choices[c.id])
              }
              onClick={submitBallot}
            >
              {busy ? "Mengirim..." : "Kirim seluruh suara"}{" "}
              <ChevronRight size={17} />
            </button>
            <small className="muted">
              Setelah dikirim, pilihan tidak dapat diubah.
            </small>
          </section>
        </main>
      )}
      {page === "admin" && (
        <main className="container">
          {!session ? (
            <section className="login-card">
              <div className="admin-icon">
                <ShieldCheck size={30} />
              </div>
              <div className="eyebrow red">AREA TERBATAS</div>
              <h2>Admin Bawaslu Puslitbangdiklat</h2>
              <p>
                Masuk untuk memantau hasil voting dan mengatur pengumuman
                pemenang.
              </p>
              <form onSubmit={login}>
                <label>Email admin</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                  placeholder="admin@instansi.go.id"
                />
                <label>Password</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  placeholder="Password admin"
                />
                {message && <p className="error-text">{message}</p>}
                <button
                  className="btn primary full"
                  disabled={busy || !configured}
                >
                  {busy ? "Memproses..." : "Masuk dashboard"}
                </button>
              </form>
            </section>
          ) : (
            <>
              <div className="admin-heading">
                <div>
                  <div className="eyebrow red">CONTROL CENTER</div>
                  <h1>Dashboard Admin</h1>
                  <p>Monitoring perolehan suara secara real-time.</p>
                </div>
                <div className="admin-actions">
                  <button
                    className="btn danger"
                    onClick={handleResetVoting}
                    disabled={resetLoading}
                    title="Hapus seluruh suara dan reset status pemilih"
                  >
                    {resetLoading ? "Mereset..." : "Reset All Voting"}
                  </button>
                  <button
                    className={`btn ${votingOpen ? "secondary" : "primary"}`}
                    onClick={toggleVoting}
                  >
                    {votingOpen ? "Tutup voting" : "Buka voting"}
                  </button>
                  <button className="btn secondary" onClick={loadAdmin}>
                    <RefreshCw size={16} /> Refresh
                  </button>
                  <button className="btn secondary" onClick={logout}>
                    <LogOut size={16} /> Keluar
                  </button>
                </div>
              </div>
              <div className="stat-grid">
                <div className="stat-card">
                  <Users />
                  <small>Total pemilih</small>
                  <b>{totalVoters}</b>
                </div>
                <div className="stat-card">
                  <CheckCircle2 />
                  <small>Sudah voting</small>
                  <b>{votedCount}</b>
                </div>
                <div className="stat-card">
                  <Vote />
                  <small>Belum voting</small>
                  <b>{totalVoters - votedCount}</b>
                </div>
                <div className="stat-card">
                  <BarChart3 />
                  <small>Total suara masuk</small>
                  <b>{stats.reduce((n, s) => n + s.total, 0)}</b>
                </div>
              </div>
              <div className="admin-section-title">
                <h2>Hasil per kategori</h2>
                <span>Update otomatis saat ada suara baru</span>
              </div>
              <div className="results-grid">
                {stats.map((s, i) => (
                  <div className="result-card" key={s.id}>
                    <div className="result-top">
                      <span>KATEGORI {String(i + 1).padStart(2, "0")}</span>
                      <b>{s.total} suara</b>
                    </div>
                    <h3>{s.name}</h3>
                    {s.rank.slice(0, 5).map(([id, count]) => (
                      <div className="bar-row" key={id}>
                        <div className="bar-label">
                          <span>
                            {people.find((p) => p.id === id)?.full_name ||
                              "Kandidat"}
                          </span>
                          <b>{count}</b>
                        </div>
                        <div className="bar">
                          <i
                            style={{
                              width: `${s.total ? (count / s.total) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                    {!s.total && (
                      <p className="muted">Belum ada suara masuk.</p>
                    )}
                    <div className="winner-control">
                      {winners.find((w) => w.category_id === s.id)
                        ?.is_published ? (
                        <button
                          className="btn secondary full"
                          onClick={() => unpublishWinner(s)}
                        >
                          Batalkan publikasi pemenang
                        </button>
                      ) : (
                        <button
                          className="btn primary full"
                          disabled={!s.total}
                          onClick={() => publishWinner(s)}
                        >
                          Tetapkan & publikasikan pemenang
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      )}
      {page === "winners" && (
        <main className="container">
          <section className="winner-hero">
            <div className="eyebrow">
              <Sparkles size={14} /> MALAM PENGANUGERAHAN
            </div>
            <h1>And the winner is...</h1>
            <p>Bawaslu Puslitbangdiklat · 2026</p>
          </section>
          <div className="winner-stage">
            {published.length ? (
              <>
                {published[revealIndex % published.length] && (
                  <div className="winner-reveal">
                    <div className="laurel">✦</div>
                    <div className="winner-trophy">
                      <Trophy size={48} />
                    </div>
                    <div className="eyebrow red">PEMENANG KATEGORI</div>
                    <h2>{published[revealIndex % published.length].name}</h2>
                    <h3>
                      {people.find(
                        (p) =>
                          p.id ===
                          published[revealIndex % published.length].winner
                            .candidate_id,
                      )?.full_name || "Pemenang"}
                    </h3>
                    <div className="winner-seal">BAWASLU PUSLITBANGDIKLAT</div>
                    <div className="reveal-controls">
                      <button
                        className="btn secondary"
                        onClick={() =>
                          setRevealIndex(Math.max(0, revealIndex - 1))
                        }
                      >
                        <ChevronLeft /> Sebelumnya
                      </button>
                      <span>
                        {(revealIndex % published.length) + 1} /{" "}
                        {published.length}
                      </span>
                      <button
                        className="btn primary"
                        onClick={() =>
                          setRevealIndex((revealIndex + 1) % published.length)
                        }
                      >
                        Berikutnya <ChevronRight />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state">
                <Trophy size={36} />
                <h3>Pengumuman belum dimulai</h3>
                <p>
                  Pemenang akan ditampilkan di sini setelah admin
                  mempublikasikannya.
                </p>
              </div>
            )}
          </div>
        </main>
      )}
      <footer>
        <Brand />
        <span>© 2026 Bawaslu Puslitbangdiklat</span>
      </footer>
    </div>
  );
}
