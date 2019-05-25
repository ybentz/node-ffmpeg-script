const path = require('path')
const fs = require('fs')
const { spawn } = require('child-process-promise')

const videoDirName = 'videos'
const dirPath = path.join(__dirname, `${videoDirName}`)
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
    const videoDirPath = path.join(__dirname, `${videoDirName}/`, `${fileName}`)
    makeDirIfDoesntExist(videoDirPath, async err => {
      if (err) {
        console.log(`Something went wrong creating folder for ${file}`)
      }
      try {
        await spawn('ffmpeg', [
          '-i',
          `${videoDirName}/${file}`,
          `${videoDirName}/${fileName}/${fileName}_%03d.png`,
        ])
      } catch (error) {
        console.log(error)
      }
      fs.readdir(videoDirPath, (imageDirError, images) => {
        if (videoDirError) {
          return console.log(
            'Unable to read images directory: ' + imageDirError
          )
        }
        images.forEach(async image => {
          try {
            await spawn('ffmpeg', [
              '-i',
              `${videoDirName}/${fileName}/${image}`,
              '-vf',
              'chromakey=0x70de77:0.19:0.0',
              `${videoDirName}/${fileName}/temp_${image}`,
            ])
          } catch (error) {
            console.log(error)
          }
          try {
            await spawn('ffmpeg', [
              '-i',
              `${videoDirName}/${fileName}/temp_${image}`,
              '-vf',
              'crop=512:900:240:40',
              `${videoDirName}/${fileName}/cropped_${image}`,
            ])
          } catch (error) {
            console.log(`Error cropping images: ${error}`)
          }
          // clean up temp images
          fs.rename(
            `${videoDirName}/${fileName}/cropped_${image}`,
            `${videoDirName}/${fileName}/${image}`,
            renameError => {
              if (renameError) {
                console.log(
                  `Something went wrong renaming ${image} for cleanup: ${renameError}`
                )
              }
            }
          )
          fs.unlink(
            `${videoDirName}/${fileName}/temp_${image}`,
            deleteError => {
              if (deleteError) {
                console.log(`Error trying to delete temp image ${deleteError}`)
              }
            }
          )
        })
        console.log(`Done!`)
      })
    })
  })
})

const makeDirIfDoesntExist = (path, cb) => {
  fs.mkdir(path, err => {
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
