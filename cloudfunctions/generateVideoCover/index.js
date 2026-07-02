// 云函数：使用 ffmpeg 生成视频封面
const cloud = require('wx-server-sdk')
const ffmpeg = require('fluent-ffmpeg')
const fs = require('fs')
const path = require('path')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { id, videoFileID, time = '0.5' } = event

  if (!id || !videoFileID) {
    return { success: false, message: '参数不完整' }
  }

  const db = cloud.database()
  const mediaColl = db.collection('media')

  try {
    // 1. 下载视频到临时目录
    const videoRes = await cloud.downloadFile({ fileID: videoFileID })
    const tempDir = '/tmp'
    const localVideoPath = path.join(tempDir, id + '.mp4')
    const localCoverPath = path.join(tempDir, id + '.jpg')

    fs.writeFileSync(localVideoPath, videoRes.fileContent)
    console.log('视频下载完成：', localVideoPath)

    // 2. 用 ffmpeg 截取第 0.5 秒
    await new Promise(function (resolve, reject) {
      ffmpeg(localVideoPath)
        .screenshots({
          timestamps: [time],
          filename: id + '.jpg',
          folder: tempDir,
          size: '320x200'
        })
        .on('end', resolve)
        .on('error', reject)
    })

    console.log('视频截帧完成：', localCoverPath)

    // 3. 上传封面图到云存储
    const coverBuffer = fs.readFileSync(localCoverPath)
    const uploadRes = await cloud.uploadFile({
      cloudPath: 'videos/covers/' + id + '.jpg',
      fileContent: coverBuffer
    })

    console.log('封面上传完成：', uploadRes.fileID)

    // 4. 更新数据库
    await mediaColl.doc(id).update({
      data: {
        cover: uploadRes.fileID,
        updatedAt: Date.now()
      }
    })

    // 5. 清理临时文件
    try {
      fs.unlinkSync(localVideoPath)
      fs.unlinkSync(localCoverPath)
    } catch (e) {}

    return {
      success: true,
      cover: uploadRes.fileID
    }
  } catch (err) {
    console.error('生成视频封面失败：', err)
    return {
      success: false,
      message: err.message || '生成失败'
    }
  }
}