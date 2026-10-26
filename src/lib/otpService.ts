import { db, doc, setDoc, getDoc, serverTimestamp } from '../firebase.js';

export const generateCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export type OTPType = 'reset' | 'verify' | 'change';

export const sendOTPEmail = async (
  email: string,
  type: OTPType | string = 'reset',
  code?: string
): Promise<string> => {
  const finalCode = code || generateCode();
  const cleanEmail = email.trim().toLowerCase();
  const col =
    type === 'reset'
      ? 'password_reset_codes'
      : type === 'verify'
      ? 'email_verify_codes'
      : 'email_change_codes';

  // Save to Firestore with 15 min expiry
  await setDoc(doc(db, col, cleanEmail), {
    email: cleanEmail,
    code: finalCode,
    createdAt: serverTimestamp(),
    expiresAt: Date.now() + 15 * 60 * 1000,
    used: false
  });

  console.log(`[OTP] Sent to ${cleanEmail} (${type}): ${finalCode}`);

  // Send via EmailJS if configured in localStorage
  if (typeof window !== 'undefined') {
    const sid = localStorage.getItem('emailjs_service_id');
    const tid = localStorage.getItem('emailjs_template_id');
    const pk = localStorage.getItem('emailjs_public_key');

    if (sid && tid && pk) {
      try {
        await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: sid,
            template_id: tid,
            user_id: pk,
            template_params: {
              to_email: cleanEmail,
              to_name: cleanEmail.split('@')[0],
              app_name: 'Tension Free Science',
              code: finalCode,
              type
            }
          })
        });
      } catch (e) {
        console.error('[OTP EmailJS error]:', e);
      }
    }
  }

  return finalCode;
};

export const verifyOTPCode = async (
  email: string,
  enteredCode: string,
  type: OTPType | string = 'reset'
): Promise<boolean> => {
  const cleanEmail = email.trim().toLowerCase();
  const col =
    type === 'reset'
      ? 'password_reset_codes'
      : type === 'verify'
      ? 'email_verify_codes'
      : 'email_change_codes';

  const ref = doc(db, col, cleanEmail);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error('Code not found');
  }

  const d = snap.data();
  if (d.used) {
    throw new Error('Code has already been used');
  }
  if (Date.now() > d.expiresAt) {
    throw new Error('Code has expired');
  }
  if (d.code !== enteredCode.trim()) {
    throw new Error('Wrong verification code');
  }

  await setDoc(ref, { ...d, used: true }, { merge: true });
  return true;
};
