// サイドバーをドロワーとして重ねる幅。sidebar.css の @media (max-width: 768px) と揃える
export const DRAWER_MEDIA_QUERY = '(max-width: 768px)'

export function isDrawerLayout(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.(DRAWER_MEDIA_QUERY).matches === true
}
