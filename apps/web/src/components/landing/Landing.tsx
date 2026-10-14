import Link from 'next/link';
import './landing.css';

export function Landing() {
  return (
    <div className="landing">
      <header className="top-bar">
        <div className="wrap">
          <Link className="brand" href="/">
            Job Filler
          </Link>
          <nav>
            <a href="#how">How it works</a>
            <a href="#trust">Trust</a>
            <Link href="/dashboard">Your profile</Link>
          </nav>
        </div>
      </header>

      <main>
        <section>
          <div className="wrap">
            <h1>
              Apply everywhere.
              <br />
              Type it once.
            </h1>
            <p className="lead">
              Job Filler keeps one complete profile of you and fills it into Workday, Greenhouse, Lever
              and Ashby applications with a browser extension. You review. You submit.
            </p>
            <Link className="button" href="/dashboard">
              Set up your profile
            </Link>
            <a className="button secondary" href="#how">
              See how it works
            </a>
            <p className="note">Free · Runs on your own machine · Never submits without you</p>
          </div>
        </section>

        <section className="alt" id="how">
          <div className="wrap">
            <h2>Three steps, then it&apos;s routine</h2>
            <div className="grid">
              <div>
                <div className="num">1</div>
                <h3>Record</h3>
                <p>Fill in your profile once: name, education, work history. UK-aware, down to your 2:1.</p>
              </div>
              <div>
                <div className="num">2</div>
                <h3>Detect</h3>
                <p>
                  Open an application. The extension recognises the form and maps each field to your
                  profile.
                </p>
              </div>
              <div>
                <div className="num">3</div>
                <h3>Review &amp; submit</h3>
                <p>
                  One click fills the current step, then it stops. You check every answer and press
                  submit yourself.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="trust">
          <div className="wrap">
            <h2>Fast, but never reckless</h2>
            <p className="lead">Autofill only earns its place if you can trust every character it types.</p>
            <div className="grid two">
              <div>
                <h3>Local profile storage</h3>
                <p>
                  Job Filler stores the portal profile in a local database file. You are responsible for
                  securing the computer, browser, network and storage you use with it.
                </p>
              </div>
              <div>
                <h3>Never auto-submits</h3>
                <p>
                  The extension fills the current step and stops. Every application is sent only when
                  you press the button.
                </p>
              </div>
              <div>
                <h3>UK-aware education</h3>
                <p>Record your degree the way employers ask for it: a First, a 2:1, a percentage or a mark.</p>
              </div>
              <div>
                <h3>Chrome &amp; Firefox</h3>
                <p>
                  The extension talks to the portal running on your machine — no sign-in, no account to
                  manage.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="alt">
          <div className="wrap">
            <h2>Two minutes to set up</h2>
            <p className="lead">Build your profile once and never retype it.</p>
            <Link className="button" href="/dashboard">
              Set up your profile
            </Link>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">Job Filler · One profile, every application · Open source</div>
      </footer>
    </div>
  );
}
