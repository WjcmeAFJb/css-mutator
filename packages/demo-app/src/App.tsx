import React from "react";
import { Navbar } from "./components/Navbar.tsx";
import { HeroSection } from "./components/HeroSection.tsx";
import { CardGrid } from "./components/CardGrid.tsx";
import { Modal } from "./components/Modal.tsx";
import { PricingTable } from "./components/PricingTable.tsx";
import { Footer } from "./components/Footer.tsx";
import styles from "./styles/app.module.css";

export function App() {
  const [showModal, setShowModal] = React.useState(false);

  return (
    <div className={styles.app}>
      <Navbar />
      <main className={styles.main}>
        <HeroSection onAction={() => setShowModal(true)} />
        <CardGrid />
        <PricingTable />
      </main>
      <Footer />
      {showModal && <Modal onClose={() => setShowModal(false)} />}
    </div>
  );
}
