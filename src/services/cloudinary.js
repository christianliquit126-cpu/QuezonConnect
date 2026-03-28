const CLOUD_NAME = 'de5zfe8tn'
const UPLOAD_PRESET = 'portfolio'
const BASE_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`

export const uploadToCloudinary = async (file, onProgress) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', 'qc-community')

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText)
        const optimizedUrl = data.secure_url.replace(
          '/upload/',
          '/upload/f_auto,q_auto,w_1200/'
        )
        resolve({ url: optimizedUrl, publicId: data.public_id })
      } else {
        reject(new Error('Upload failed'))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
    xhr.open('POST', BASE_URL)
    xhr.send(formData)
  })
}

export const getAvatarUrl = (url) => {
  if (!url) return null
  if (!url.includes('cloudinary.com')) return url
  return url.replace('/upload/', '/upload/f_auto,q_auto,w_200,h_200,c_fill,g_face/')
}

export const getThumbnailUrl = (url) => {
  if (!url) return null
  if (!url.includes('cloudinary.com')) return url
  return url.replace('/upload/', '/upload/f_auto,q_auto,w_600/')
}
