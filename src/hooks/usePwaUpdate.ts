import {useRegisterSW} from 'virtual:pwa-register/react'

export function usePwaUpdate() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      setInterval(() => registration.update(), 60 * 60 * 1000)
    },
  })

  const updateApp = () => updateServiceWorker(true)
  const dismiss = () => setNeedRefresh(false)

  return { needRefresh, updateApp, dismiss }
}
