package com.jianliao.android.data.repo

import com.jianliao.android.data.api.JianliaoApi
import com.jianliao.android.data.model.BrandingModel

class BrandingRepository(
    private val api: JianliaoApi
) {
    suspend fun getMobileBranding(): BrandingModel =
        runCatching { api.getBranding("mobile").normalized() }
            .getOrDefault(FALLBACK_BRANDING)

    private fun BrandingModel.normalized(): BrandingModel =
        copy(
            platformGroup = platformGroup.ifBlank { FALLBACK_BRANDING.platformGroup },
            projectName = projectName.trim().ifBlank { FALLBACK_BRANDING.projectName },
            logoUrl = logoUrl?.trim()?.takeIf { it.isNotEmpty() },
            themeAssetUrl = themeAssetUrl?.trim()?.takeIf { it.isNotEmpty() }
        )

    companion object {
        val FALLBACK_BRANDING = BrandingModel(
            platformGroup = "mobile",
            projectName = "柬单聊",
            logoUrl = null,
            themeAssetUrl = null
        )
    }
}
