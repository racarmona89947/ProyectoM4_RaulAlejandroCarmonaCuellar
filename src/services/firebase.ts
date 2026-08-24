import { getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import {
	initializeFirestore,
	getFirestore,
	persistentLocalCache,
	persistentMultipleTabManager,
} from 'firebase/firestore'
import { firebaseConfig, getMissingFirebaseEnvKeys } from '../config/firebase'

const missingFirebaseEnvKeys = getMissingFirebaseEnvKeys()

if (missingFirebaseEnvKeys.length > 0) {
	throw new Error(
		`Faltan variables de entorno de Firebase: ${missingFirebaseEnvKeys.join(', ')}. Revisa tu archivo .env`,
	)
}

const existingApp = getApps()[0]

export const app = existingApp ?? initializeApp(firebaseConfig)
export const auth = getAuth(app)

function createFirestore() {
	try {
		return initializeFirestore(app, {
			localCache: persistentLocalCache({
				tabManager: persistentMultipleTabManager(),
			}),
		})
	} catch {
		return getFirestore(app)
	}
}

export const db = createFirestore()
