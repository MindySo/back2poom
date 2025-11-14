import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Text from '../../components/common/atoms/Text';
import Button from '../../components/common/atoms/Button';
import logoPolice from '../../assets/logo_police.png';
import styles from './PoliceLoginPage.module.css';

const PoliceLoginPage = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: 로그인 API 호출
    console.log('Login attempt:', { username, password });
    // 로그인 성공 시 이동할 페이지로 리다이렉트
    navigate('/police/map');
  };

  return (
    <div className={styles.container}>
      <div className={styles.logoContainer}>
        <img src={logoPolice} alt="품으로 로고" className={styles.logo} />
      </div>
      <div className={styles.loginCard}>
        <Text as="h1" size="xxl" weight="bold" color="black" className={styles.title}>
          품으로 실종자 관제 시스템
        </Text>
        
        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <Text as="span" size="sm" weight="bold" color="black">
                아이디
              </Text>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={styles.input}
              placeholder="아이디를 입력하세요"
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <Text as="span" size="sm" weight="bold" color="black">
                비밀번호
              </Text>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="비밀번호를 입력하세요"
              required
            />
          </div>

          <Button
            type="submit"
            variant="darkPrimary"
            size="large"
            fullWidth
            className={styles.loginButton}
          >
            로그인
          </Button>
        </form>
      </div>
    </div>
  );
};

export default PoliceLoginPage;

