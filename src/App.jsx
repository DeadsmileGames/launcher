function App() {
  return (
    <main className="launcher">
      <aside className="sidebar">
        <div className="brand">
          <strong>DEADSMILE</strong>
          <span>GAMES</span>
        </div>

        <nav>
          <button className="active">Home</button>
          <button>My Games</button>
          <button>News</button>
          <button>Wishlist</button>
        </nav>

        <button className="settings">Settings</button>
      </aside>

      <section className="content">
        <header>
          <span>DEADSMILE LAUNCHER</span>
        </header>

        <section className="hero">
          <div>
            <p>WELCOME BACK</p>
            <h1>DEADSMILE<br />GAMES</h1>
            <button className="play">MY GAMES</button>
          </div>
        </section>
      </section>
    </main>
  );
}

export default App;