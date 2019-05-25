const path = require('path')
const fs = require('fs')
const { spawn } = require('child-process-promise')

const videoDirName = 'videos'
const dirPath = `${videoDirName}`

fs.readdir(dirPath, (videoDirError, files) => {
  if (videoDirError) {
    return console.log('Unable to read videos directory: ' + videoDirError)
  }
  files.forEach(file => {
    // skip hidden files on macOS
    if (file.charAt(0) === '.') {
      return
    }
    console.log(`Converting video: ${file}`)
    const fileName = file.substring(0, file.lastIndexOf('.'))
    const videoDirRelativePath = `${videoDirName}/${fileName}`
    makeDirIfDoesntExist(videoDirRelativePath, async err => {
      if (err) {
        console.log(`Something went wrong creating folder for ${file}`)
      }
      try {
        await spawn('ffmpeg', [
          '-i',
          `${videoDirName}/${file}`,
          `${videoDirRelativePath}/${fileName}_%03d.png`,
        ])
      } catch (error) {
        console.log(error)
      }
      fs.readdir(videoDirRelativePath, (imageDirError, images) => {
        if (videoDirError) {
          return console.log(
            'Unable to read images directory: ' + imageDirError
          )
        }
        images.forEach(async image => {
          try {
            await spawn('ffmpeg', [
              '-i',
              `${videoDirRelativePath}/${image}`,
              '-vf',
              'chromakey=0x70de77:0.19:0.0',
              `${videoDirRelativePath}/temp_${image}`,
            ])
          } catch (error) {
            console.log(error)
          }
          try {
            await spawn('ffmpeg', [
              '-i',
              `${videoDirRelativePath}/temp_${image}`,
              '-vf',
              'crop=512:900:240:40',
              `${videoDirRelativePath}/cropped_${image}`,
            ])
          } catch (error) {
            console.log(`Error cropping images: ${error}`)
          }
          // clean up temp images
          fs.rename(
            `${videoDirRelativePath}/cropped_${image}`,
            `${videoDirRelativePath}/${image}`,
            renameError => {
              if (renameError) {
                console.log(
                  `Something went wrong renaming ${image} for cleanup: ${renameError}`
                )
              }
            }
          )
          fs.unlink(`${videoDirRelativePath}/temp_${image}`, deleteError => {
            if (deleteError) {
              console.log(`Error trying to delete temp image ${deleteError}`)
            }
          })
        })
        console.log(`Done!`)
      })
    })
  })
})

const makeDirIfDoesntExist = (relativePath, cb) => {
  const absolutePath = path.join(__dirname, relativePath)
  fs.mkdir(absolutePath, err => {
    if (err) {
      if (err.code == 'EEXIST') {
        cb(null)
      } else {
        cb(err)
      }
    } else {
      cb(null)
    }
  })
}
