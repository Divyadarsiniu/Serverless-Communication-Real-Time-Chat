import React from 'react';
import Logo from '../components/Logo';
import ThemeToggle from '../components/ThemeToggle';
import LandingNetwork from '../components/LandingNetwork';
import {
  Zap,
  Shield,
  Database,
  Radio,
  ArrowRight,
  Server,
  Cloud,
  CheckCircle2,
  Lock,
  Cpu,
  RefreshCw,
  Eye
} from 'lucide-react';
import { config } from '../config';

export default function LandingPage({ onNavigateLogin, onNavigateRegister }) {
  const isAws = config.isLiveAws;

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-wrap">
      {/* Top Navigation */}
      <nav className="landing-nav">
        <Logo size="md" />

        <ul className="landing-nav-links">
          <li>
            <button
              onClick={() => scrollToSection('hero')}
              className="landing-nav-link"
              style={{ background: 'none', border: 'none' }}
            >
              Home
            </button>
          </li>
          <li>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="landing-nav-link"
              style={{ background: 'none', border: 'none' }}
            >
              How It Works
            </button>
          </li>
          <li>
            <button
              onClick={() => scrollToSection('features')}
              className="landing-nav-link"
              style={{ background: 'none', border: 'none' }}
            >
              Features
            </button>
          </li>
          <li>
            <button
              onClick={() => scrollToSection('security')}
              className="landing-nav-link"
              style={{ background: 'none', border: 'none' }}
            >
              Security
            </button>
          </li>
        </ul>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <ThemeToggle />

          <button
            onClick={onNavigateLogin}
            className="btn btn-ghost"
            style={{ padding: '0.6rem 1.1rem', fontSize: '0.9rem' }}
          >
            Sign In
          </button>

          <button
            onClick={onNavigateRegister}
            className="btn btn-primary"
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}
          >
            <span>Get Started</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="hero" className="hero-section">
        <div className="hero-pill">
          <Zap size={14} />
          <span>Serverless Real-Time Communication Platform</span>
        </div>

        <h1 className="hero-title">
          Communication that moves in real time.
        </h1>

        <p className="hero-desc">
          Connect, communicate, and stay present through a serverless real-time platform
          powered by AWS API Gateway WebSockets, Lambda microservices, and DynamoDB.
        </p>

        <div className="hero-cta-group">
          <button
            onClick={onNavigateRegister}
            className="btn btn-primary btn-glow"
            style={{ padding: '0.9rem 2rem', fontSize: '1.05rem' }}
          >
            <span>Start Connecting</span>
            <ArrowRight size={18} />
          </button>

          <button
            onClick={() => scrollToSection('network-canvas')}
            className="btn btn-secondary"
            style={{ padding: '0.9rem 1.8rem', fontSize: '1.05rem' }}
          >
            <span>Explore The System</span>
          </button>
        </div>

        {/* Mode Indicator Tag */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div className={`mode-badge ${isAws ? 'mode-aws' : 'mode-mock'}`}>
            {isAws ? <Cloud size={14} /> : <Server size={14} />}
            <span>Running in {isAws ? 'Live AWS Serverless Cloud' : 'Local Demo Architecture'}</span>
          </div>
        </div>

        {/* Visual Interactive Element: Animated Signal Canvas */}
        <div id="network-canvas" className="network-card-wrap">
          <LandingNetwork />
        </div>
      </section>

      {/* How It Works Section: 5-Stage Interactive Sequence */}
      <section id="how-it-works" className="stages-section">
        <div className="section-head">
          <div className="section-tag">Architecture Pipeline</div>
          <h2 className="section-title">How The Serverless Engine Works</h2>
          <p className="section-desc">
            A 5-stage reactive event chain replaces traditional long-polling web servers
            with event-driven cloud services.
          </p>
        </div>

        <div className="stages-grid">
          {/* Stage 1 */}
          <div className="stage-card">
            <div className="stage-number">01</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Cognito Handshake</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              Clients authenticate securely against Amazon Cognito User Pool. An ID/Access JWT token is issued to establish identity.
            </p>
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
              <Lock size={13} />
              <span>JWT Authentication</span>
            </div>
          </div>

          {/* Stage 2 */}
          <div className="stage-card">
            <div className="stage-number">02</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Persistent WSS</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              API Gateway WebSocket API handles bi-directional connection handshakes. AWS Lambda maps the connection ID into DynamoDB.
            </p>
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
              <Radio size={13} />
              <span>API Gateway WSS</span>
            </div>
          </div>

          {/* Stage 3 */}
          <div className="stage-card">
            <div className="stage-number">03</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Lambda Dispatch</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              When a user speaks, Lambda validates payload integrity, queries recipient connection mapping, and pushes over the socket.
            </p>
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
              <Cpu size={13} />
              <span>Sub-15ms Event Routing</span>
            </div>
          </div>

          {/* Stage 4 */}
          <div className="stage-card">
            <div className="stage-number">04</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>DynamoDB Store</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              Transmissions are persisted into Amazon DynamoDB with a partition key compound index, guaranteeing strict chronology.
            </p>
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
              <Database size={13} />
              <span>Persistent Cloud DB</span>
            </div>
          </div>

          {/* Stage 5 */}
          <div className="stage-card">
            <div className="stage-number">05</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>True Read Lifecycle</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              State machine strictly updates: SENT (stored) → DELIVERED (socket reached) → SEEN (observed in viewport). Zero fake ticks.
            </p>
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--seen-color)', fontWeight: 700 }}>
              <Eye size={13} />
              <span>Viewport Verified</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div className="section-head">
          <div className="section-tag">Key Capabilities</div>
          <h2 className="section-title">Engineered for Elasticity</h2>
          <p className="section-desc">
            Complete serverless infrastructure built according to the AWS Well-Architected Framework.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-box">
            <div className="feature-icon-wrap">
              <Zap size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.65rem' }}>
              Zero-Polling Real Time
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.6 }}>
              No client-side <code>setInterval</code> loops or repetitive HTTP queries. Message delivery is 100% reactive through API Gateway Management API pushes.
            </p>
          </div>

          <div className="feature-box">
            <div className="feature-icon-wrap">
              <Database size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.65rem' }}>
              Amazon DynamoDB Storage
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.6 }}>
              Single-digit millisecond latency at any scale. Messages and active connection states are managed in on-demand capacity tables.
            </p>
          </div>

          <div className="feature-box">
            <div className="feature-icon-wrap">
              <RefreshCw size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.65rem' }}>
              Dynamic Reconnection & Ping
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.6 }}>
              Intelligent exponential backoff auto-reconnects dropouts, while periodic keep-alive heartbeats prevent idle socket disconnections.
            </p>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="security-wrap">
        <div>
          <div className="section-tag">Cloud Security</div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '1rem' }}>
            Multi-Layer Cloud Protection
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.65, marginBottom: '1.5rem' }}>
            Built strictly on AWS principle of least privilege (PoLP). All communication is protected with industry-standard TLS encryption.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
              <CheckCircle2 size={18} color="var(--success)" />
              <span>Amazon Cognito User Pools with SRP password hashing</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
              <CheckCircle2 size={18} color="var(--success)" />
              <span>IAM role isolation per microservice function</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
              <CheckCircle2 size={18} color="var(--success)" />
              <span>Amazon S3 pre-signed upload URLs with strict expiration</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
              <CheckCircle2 size={18} color="var(--success)" />
              <span>Recipient-only authorization for markSeen read updates</span>
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '20px',
            padding: '2rem',
            boxShadow: 'var(--shadow-md)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <Shield size={28} color="var(--accent-primary)" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>Zero Secret Frontend</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Public client security compliance</div>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            No AWS IAM secret access keys or DynamoDB write credentials ever exist in the client. The browser communicates exclusively via temporary bearer tokens and authenticated WebSocket frames.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Logo size="sm" />
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Serverless Communication Through Real-Time Chat
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <button
              onClick={onNavigateLogin}
              className="landing-nav-link"
              style={{ background: 'none', border: 'none' }}
            >
              Sign In
            </button>
            <button
              onClick={onNavigateRegister}
              className="landing-nav-link"
              style={{ background: 'none', border: 'none' }}
            >
              Create Account
            </button>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Academic Cloud Computing Project • AWS Serverless SAM
          </div>
        </div>
      </footer>
    </div>
  );
}
