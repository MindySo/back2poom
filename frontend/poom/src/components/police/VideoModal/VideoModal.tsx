import React from 'react';
import styles from './VideoModal.module.css';

interface VideoModalProps {
  isOpen: boolean;
  videoUrl: string | null;
  onClose: () => void;
}

const VideoModal: React.FC<VideoModalProps> = ({ isOpen, videoUrl, onClose }) => {
  if (!isOpen || !videoUrl) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>×</button>
        <video controls autoPlay className={styles.video}>
          <source src={videoUrl} type="video/mp4" />
          브라우저가 video 태그를 지원하지 않습니다.
        </video>
      </div>
    </div>
  );
};

export default VideoModal;
