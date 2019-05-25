const { spawn } = require('child-process-promise')
const fs = require('fs')
const path = require('path')

const { promisify } = require('util')
const fsMkdir = promisify(fs.mkdir)
const fsReaddir = promisify(fs.readdir)
const fsRename = promisify(fs.rename)
const fsUnlink = promisify(fs.unlink)

const videoDirName = 'videos'
const dirPath = path.join(__dirname, videoDirName)

fsReaddir(dirPath).then(async videos => {
  for (const video of videos) {
    // skip hidden files on macOS
    if (video.charAt(0) === '.') {
      continue
    }
    console.log(`Converting video: ${video}`)
    const videoName = video.substring(0, video.lastIndexOf('.'))
    const videoDirRelativePath = `${videoDirName}/${videoName}`
    try {
      await makeDirIfDoesntExist(videoDirRelativePath)
      await spawn('ffmpeg', [
        '-i',
        `${videoDirName}/${video}`,
        `${videoDirRelativePath}/${videoName}_%03d.png`,
      ])
      console.log(`Extracted frames`)
      const images = await fsReaddir(videoDirRelativePath)
      for (const image of images) {
        // skip hidden files on macOS
        if (image.charAt(0) === '.') {
          continue
        }
        console.log(`Processing image: ${image}`)
        await spawn('ffmpeg', [
          '-i',
          `${videoDirRelativePath}/${image}`,
          '-vf',
          'chromakey=0x70de77:0.19:0.0',
          `${videoDirRelativePath}/temp_${image}`,
        ])
        await spawn('ffmpeg', [
          '-i',
          `${videoDirRelativePath}/temp_${image}`,
          '-vf',
          'crop=512:900:240:40',
          `${videoDirRelativePath}/cropped_${image}`,
        ])
        await fsRename(
          `${videoDirRelativePath}/cropped_${image}`,
          `${videoDirRelativePath}/${image}`
        )
        await fsUnlink(`${videoDirRelativePath}/temp_${image}`)
        console.log(`Successfully processed image: ${image}`)
      }
    } catch (err) {
      console.log(`Something went wrong for file '${video}'. Error: ${err}`)
    }
    console.log(`Successfully processed video: ${video}`)
  }
  console.log(`Done!`)
})

const makeDirIfDoesntExist = async relativePath => {
  const absolutePath = path.join(__dirname, relativePath)
  return fsMkdir(absolutePath).catch(err => {
    if (err.code == 'EEXIST') {
      // Folder exists, continue normally
      return Promise.resolve()
    } else {
      return Promise.reject(err)
    }
  })
}
