---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "wicketkeeper"
  tagline: A lightweight, self-hostable, and privacy-respecting captcha solution.
  image:
    src: /assets/logo.svg
    alt: Wicketkeeper
    theme: light
  actions:
    - theme: brand
      text: Get Started
      link: /guide/
    - theme: alt
      text: API Reference
      link: /reference/api-reference

features:
  - title: 🧠 Invisible Proof-of-Work
    details: Replaces frustrating user puzzles with a quick, background computational challenge that's invisible to humans but effectively deters bots.

  - title: 🛡️ Self-Hostable & Privacy-First
    details: Host it on your own infrastructure. No user data is ever sent to third-party services, ensuring complete privacy and GDPR/CCPA compliance.

  - title: 🔒 Advanced Replay Protection
    details: Utilizes time-windowed Redis Bloom filters to efficiently prevent replay attacks, ensuring a solved captcha challenge cannot be reused by an attacker.

  - title: 📜 Stateless & Secure by Design
    details: Employs modern Ed25519-signed JWTs for challenge tokens. This ensures tamper-proof, stateless communication between your users and the server.

  - title: 🔌 Drop-in Client Widget
    details: Integrate the captcha into any form with a single script tag and one line of HTML. The widget automatically initializes and handles the entire workflow.

  - title: ⚖️ Open & Fair Licensing
    details: A permissively licensed client (MIT) allows for easy integration into any project, paired with a copyleft server (AGPLv3) to foster community contributions.
---
