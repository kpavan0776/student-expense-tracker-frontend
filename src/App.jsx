
import { useEffect, useState } from "react";
import "./App.css";

// Local Spring Boot backend
const API = "https://student-expense-tracker-backend-1-2bgs.onrender.com/api";

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function readResponse(response) {
  const text = await response.text();

  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {
      message: text || `Server returned status ${response.status}.`,
    };
  }

  if (!response.ok) {
    throw new Error(
      data.message || `Request failed (${response.status}).`
    );
  }

  return data;
}

function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("trackerUser")) || null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(
    () => localStorage.getItem("trackerToken") || ""
  );

  const [page, setPage] = useState(() =>
    localStorage.getItem("trackerToken") &&
    localStorage.getItem("trackerUser")
      ? "dashboard"
      : "home"
  );

  const [mode, setMode] = useState("signup");
  const [expenses, setExpenses] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [date, setDate] = useState(today());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Load the signed-in user's expenses.
  useEffect(() => {
    if (!token) {
      setExpenses([]);
      return;
    }

    let cancelled = false;

    async function loadExpenses() {
      try {
        const response = await fetch(`${API}/expenses`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await readResponse(response);

        if (!cancelled) {
          setExpenses(Array.isArray(data) ? data : []);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message ||
              "Could not load expenses. Check that the backend is running."
          );
        }
      }
    }

    loadExpenses();

    return () => {
      cancelled = true;
    };
  }, [token]);

  // Sign up or sign in.
  async function handleAuth(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);

    try {
      const response = await fetch(
        `${API}/${mode === "signup" ? "signup" : "signin"}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            mode === "signup"
              ? { name: name.trim(), email: email.trim(), password }
              : { email: email.trim(), password }
          ),
        }
      );

      const data = await readResponse(response);

      if (!data.token || !data.user) {
        throw new Error("The server response is missing account details.");
      }

      localStorage.setItem("trackerToken", data.token);
      localStorage.setItem("trackerUser", JSON.stringify(data.user));

      setToken(data.token);
      setUser(data.user);
      setExpenses([]);
      setPassword("");
      setPage("dashboard");
      setMessage(data.message || "Signed in successfully.");
      setError("");
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to the server. Check that Spring Boot is running."
      );
    } finally {
      setBusy(false);
    }
  }

  // Add an expense.
  async function addExpense(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (
      !title.trim() ||
      !date ||
      !category ||
      !amount ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0
    ) {
      setError("Please provide a valid title, date, amount and category.");
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(`${API}/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          amount: Number(amount),
          category,
          date,
        }),
      });

      await readResponse(response);

      // Refresh the list after saving.
      const refreshed = await fetch(`${API}/expenses`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const items = await readResponse(refreshed);

      setExpenses(Array.isArray(items) ? items : []);
      setTitle("");
      setAmount("");
      setCategory("Food");
      setDate(today());
      setMessage("Expense saved successfully!");
    } catch (err) {
      setError(err.message || "Could not save the expense.");
    } finally {
      setBusy(false);
    }
  }

  // Sign out.
  function logout() {
    localStorage.removeItem("trackerToken");
    localStorage.removeItem("trackerUser");

    setToken("");
    setUser(null);
    setExpenses([]);
    setError("");
    setMessage("");
    setPassword("");
    setPage("home");
  }

  const total = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );

  const money = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(value);

  function openAuth(nextMode) {
    setMode(nextMode);
    setError("");
    setMessage("");
    setPage("auth");
  }

  return (
    <div className="app">
      <header className="navbar">
        <button
          className="brand"
          onClick={() => setPage(user ? "dashboard" : "home")}
        >
          <span className="brand-icon">₹</span>
          ExpenseTrack
        </button>

        <nav>
          {user ? (
            <>
              <span className="nav-user">Hi, {user.name}</span>
              <button className="btn btn-outline" onClick={logout}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <button className="nav-link" onClick={() => setPage("home")}>
                Home
              </button>
              <button
                className="btn btn-outline"
                onClick={() => openAuth("signin")}
              >
                Sign in
              </button>
              <button
                className="btn btn-primary"
                onClick={() => openAuth("signup")}
              >
                Get started
              </button>
            </>
          )}
        </nav>
      </header>

      <main>
        {page === "home" && (
          <section className="hero">
            <div className="hero-copy">
              <span className="eyebrow">YOUR MONEY, MADE CLEAR</span>
              <h1>
                Spend smarter.
                <br />
                <span>Live better.</span>
              </h1>
              <p>
                Keep track of your daily expenses, understand your spending,
                and take control of your money, one entry at a time.
              </p>

              <div className="hero-actions">
                <button
                  className="btn btn-primary btn-large"
                  onClick={() => openAuth("signup")}
                >
                  Create free account ↗
                </button>
                <button
                  className="btn btn-outline btn-large"
                  onClick={() => openAuth("signin")}
                >
                  I already have an account
                </button>
              </div>

              <div className="trust-note">
                ✦ Personal account · Simple tracking · Anytime access
              </div>
            </div>

            <div className="preview-card">
              <div className="preview-top">
                <div>
                  <span className="muted">Monthly overview</span>
                  <h2>Know where it goes.</h2>
                </div>
                <span className="preview-icon">↗</span>
              </div>

              <div className="preview-total">
                <span className="muted">Total expenses</span>
                <strong>₹4,250.00</strong>
              </div>

              <div className="fake-bar">
                <span />
              </div>

              <div className="preview-item">
                <span>🍱 Food</span>
                <strong>₹1,800</strong>
              </div>
              <div className="preview-item">
                <span>🚌 Transport</span>
                <strong>₹950</strong>
              </div>
              <div className="preview-item">
                <span>📚 Education</span>
                <strong>₹1,500</strong>
              </div>

              <p className="preview-caption">
                A sample preview of your future dashboard
              </p>
            </div>
          </section>
        )}

        {page === "auth" && (
          <section className="auth-layout">
            <div className="auth-aside">
              <span className="eyebrow">A BETTER MONEY HABIT</span>
              <h1>
                Your expenses.
                <br />
                Your clarity.
              </h1>
              <p>
                One simple place to record your spending and keep your finances
                organised.
              </p>
              <div className="auth-benefit">
                ✓ Your own personal account
              </div>
              <div className="auth-benefit">
                ✓ Expenses saved in the database
              </div>
              <div className="auth-benefit">
                ✓ Access your account after signing in
              </div>
            </div>

            <form className="auth-card" onSubmit={handleAuth}>
              <div className="auth-tabs">
                <button
                  type="button"
                  className={mode === "signup" ? "active" : ""}
                  onClick={() => openAuth("signup")}
                >
                  Sign up
                </button>
                <button
                  type="button"
                  className={mode === "signin" ? "active" : ""}
                  onClick={() => openAuth("signin")}
                >
                  Sign in
                </button>
              </div>

              <h2>
                {mode === "signup" ? "Create your account" : "Welcome back"}
              </h2>
              <p className="muted">
                {mode === "signup"
                  ? "Start tracking your expenses today."
                  : "Sign in to view your expenses."}
              </p>

              {mode === "signup" && (
                <label>
                  Full name
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    required
                    maxLength={100}
                  />
                </label>
              )}

              <label>
                Email address
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  minLength={8}
                  maxLength={72}
                  required
                />
              </label>

              {error && <div className="notice error">{error}</div>}
              {message && <div className="notice success">{message}</div>}

              <button className="btn btn-primary submit-btn" disabled={busy}>
                {busy
                  ? "Please wait..."
                  : mode === "signup"
                    ? "Create account"
                    : "Sign in"}
              </button>

              <p className="switch-copy">
                {mode === "signup" ? "Already registered?" : "New here?"}{" "}
                <button
                  type="button"
                  onClick={() =>
                    openAuth(mode === "signup" ? "signin" : "signup")
                  }
                >
                  {mode === "signup" ? "Sign in" : "Create an account"}
                </button>
              </p>
            </form>
          </section>
        )}

        {page === "dashboard" && (
          <section className="dashboard">
            <div className="dashboard-heading">
              <div>
                <span className="eyebrow">YOUR PERSONAL SPACE</span>
                <h1>Expense dashboard</h1>
                <p className="muted">
                  Welcome back, {user?.name}. Every rupee has a place.
                </p>
              </div>
              <span className="dashboard-badge">● Account active</span>
            </div>

            {error && <div className="notice error">{error}</div>}
            {message && <div className="notice success">{message}</div>}

            <div className="summary-card">
              <div>
                <span>Total recorded expenses</span>
                <h2>{money(total)}</h2>
                <p>
                  Across {expenses.length}{" "}
                  {expenses.length === 1 ? "entry" : "entries"}
                </p>
              </div>
              <div className="summary-icon">₹</div>
            </div>

            <div className="dashboard-grid">
              <form className="panel expense-form" onSubmit={addExpense}>
                <h2>＋ Add an expense</h2>
                <p className="muted">Record a new transaction.</p>

                <label>
                  Expense name
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Lunch"
                    required
                    maxLength={150}
                  />
                </label>

                <label>
                  Amount (₹)
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    required
                  />
                </label>

                <label>
                  Category
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  >
                    <option>Food</option>
                    <option>Transport</option>
                    <option>Education</option>
                    <option>Shopping</option>
                    <option>Bills</option>
                    <option>Entertainment</option>
                    <option>Health</option>
                    <option>Other</option>
                  </select>
                </label>

                <label>
                  Date
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </label>

                <button className="btn btn-primary submit-btn" disabled={busy}>
                  {busy ? "Saving..." : "Save expense"}
                </button>
              </form>

              <div className="panel transactions">
                <div className="transaction-heading">
                  <div>
                    <h2>Recent expenses</h2>
                    <p className="muted">Your saved transactions</p>
                  </div>
                  <span className="count-pill">{expenses.length}</span>
                </div>

                {expenses.length === 0 ? (
                  <div className="empty-state">
                    <span>🧾</span>
                    <h3>No expenses yet</h3>
                    <p>Add your first expense to see it here.</p>
                  </div>
                ) : (
                  <div className="expense-list">
                    {expenses.map((expense) => (
                      <div className="expense-row" key={expense.id}>
                        <div className="expense-symbol">
                          {expense.category === "Food"
                            ? "🍱"
                            : expense.category === "Transport"
                              ? "🚌"
                              : expense.category === "Education"
                                ? "📚"
                                : expense.category === "Shopping"
                                  ? "🛍️"
                                  : expense.category === "Health"
                                    ? "💊"
                                    : "🧾"}
                        </div>

                        <div className="expense-info">
                          <strong>{expense.title}</strong>
                          <span>
                            {expense.category} ·{" "}
                            {String(
                              expense.date ?? expense.expense_date ?? ""
                            ).slice(0, 10)}
                          </span>
                        </div>

                        <strong className="expense-amount">
                          {money(expense.amount)}
                        </strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      <footer>
        <span>₹ ExpenseTrack</span>
        <span>Small steps. Clearer finances.</span>
      </footer>
    </div>
  );
}

export default App;
