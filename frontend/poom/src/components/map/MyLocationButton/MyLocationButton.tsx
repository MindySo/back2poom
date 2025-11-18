import React from 'react';
import styles from './MyLocationButton.module.css';
import myLocationIcon from '../../../assets/my_location_icon.png';

interface MyLocationButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

const MyLocationButton: React.FC<MyLocationButtonProps> = ({ onClick, disabled = false }) => {
  return (
    <button
      className={styles.myLocationButton}
      onClick={onClick}
      disabled={disabled}
      aria-label="내 위치로 이동"
    >
      <img src={myLocationIcon} alt="내 위치" className={styles.icon} />
    </button>
  );
};

export default MyLocationButton;
