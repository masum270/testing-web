import emailjs from '@emailjs/browser';
import { db, doc, setDoc, getDoc, serverTimestamp } from '../firebase.js';

export const generateCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export type OTPType = 'reset' | 'verify' | 'change';

export const sendOTPEmail = async (
  email: string,
  typeOrCode?: OTPType | string,
  maybeCode?: string
): Promise<string> => {
  const cleanEmail = email.trim().toLowerCase();
  let type: OTPType | string = 'reset';
  let finalCode: string;

  if (typeOrCode && (typeOrCode === 'reset' || typeOrCode === 'verify' || typeOrCode === 'change')) {
    type = typeOrCode;
    finalCode = maybeCode || generateCode();
  } else if (typeOrCode && /^\d{6}$/.test(typeOrCode)) {
    finalCode = typeOrCode;
  } else {
    finalCode = maybeCode || generateCode();
  }

  const col =
    type === 'reset'
      ? 'password_reset_codes'
      : type === 'verify'
      ? 'email_verify_codes'
      : 'email_change_codes';

  // 1. Save to Firestore with 10 min expiry
  await setDoc(doc(db, col, cleanEmail), {
    email: cleanEmail,
    code: finalCode,
    createdAt: serverTimestamp(),
    expiresAt: Date.now() + 10 * 60 * 1000,
    used: false
  });

  // Also ensure password_reset_codes always has a copy if requested for password reset
  if (col !== 'password_reset_codes' && type === 'reset') {
    await setDoc(doc(db, 'password_reset_codes', cleanEmail), {
      email: cleanEmail,
      code: finalCode,
      createdAt: serverTimestamp(),
      expiresAt: Date.now() + 10 * 60 * 1000,
      used: false
    });
  }

  // 2. Send via EmailJS
  const serviceId =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_EMAILJS_SERVICE_ID) ||
    (typeof window !== 'undefined' && localStorage.getItem('emailjs_service_id')) ||
    'service_mx9cl5q';
  const templateId =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_EMAILJS_TEMPLATE_ID) ||
    (typeof window !== 'undefined' && localStorage.getItem('emailjs_template_id')) ||
    'template_shedvko';
  const publicKey =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_EMAILJS_PUBLIC_KEY) ||
    (typeof window !== 'undefined' && localStorage.getItem('emailjs_public_key')) ||
    'NJ_oL3ruyIA9dCVFK';

  if (serviceId && templateId && publicKey) {
    try {
      await emailjs.send(
        serviceId,
        templateId,
        {
          to_email: cleanEmail,
          email: cleanEmail,
          to_name: cleanEmail.split('@')[0],
          otp_code: finalCode,
          code: finalCode,
          pass_code: finalCode,
          app_name: 'Tension Free Science',
          type
        },
        publicKey
      );
    } catch (e) {
      console.error('[OTP EmailJS error]:', e);
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

  let ref = doc(db, col, cleanEmail);
  let snap = await getDoc(ref);

  // Fallback to password_reset_codes if primary not found
  if (!snap.exists() && col !== 'password_reset_codes') {
    ref = doc(db, 'password_reset_codes', cleanEmail);
    snap = await getDoc(ref);
  }

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
