import styles from "../styles/modal.module.css";

interface ModalProps {
  onClose: () => void;
}

export function Modal({ onClose }: ModalProps) {
  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-label="modal">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          &times;
        </button>
        <h2 className={styles.modalTitle}>Get Started</h2>
        <p className={styles.modalBody}>
          Install css-mutator and add the Vite plugin to your vitest config. Run{" "}
          <code>css-mutate</code> to find untested CSS.
        </p>
        <div className={styles.modalActions}>
          <button className={styles.secondaryBtn} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.primaryBtn}>Install Now</button>
        </div>
      </div>
    </div>
  );
}
