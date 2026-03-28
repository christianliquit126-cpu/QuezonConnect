import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

export const createNotification = async ({ recipientUid, type, message, link = '', senderName = '', senderAvatar = '' }) => {
  if (!recipientUid) return
  try {
    await addDoc(collection(db, 'notifications'), {
      recipientUid,
      type,
      message,
      link,
      senderName,
      senderAvatar,
      read: false,
      createdAt: serverTimestamp(),
    })
  } catch {}
}
