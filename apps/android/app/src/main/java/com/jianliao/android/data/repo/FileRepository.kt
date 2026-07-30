package com.jianliao.android.data.repo

import com.jianliao.android.data.api.JianliaoApi
import com.jianliao.android.data.model.FileUploadRequestDto
import com.jianliao.android.data.model.FileUploadResponseDto
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

class FileRepository(
    private val api: JianliaoApi,
    private val okHttp: OkHttpClient
) {
    suspend fun createUploadMetadata(filename: String, mimeType: String, size: Long): FileUploadResponseDto =
        api.createUploadMetadata(FileUploadRequestDto(filename = filename, mimeType = mimeType, size = size))

    fun uploadBytes(uploadUrl: String, mimeType: String, bytes: ByteArray) {
        val body = bytes.toRequestBody(mimeType.toMediaTypeOrNull())
        val req = Request.Builder()
            .url(uploadUrl)
            .put(body)
            .build()

        okHttp.newCall(req).execute().use { resp ->
            if (!resp.isSuccessful) {
                throw IllegalStateException("upload failed: ${resp.code}")
            }
        }
    }
}

