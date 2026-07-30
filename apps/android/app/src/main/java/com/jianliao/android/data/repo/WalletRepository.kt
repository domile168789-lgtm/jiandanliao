package com.jianliao.android.data.repo

import com.jianliao.android.data.api.JianliaoApi
import java.util.Locale

data class WalletRecord(
    val title: String,
    val amount: String,
    val status: String,
    val timestamp: String
)

data class WalletSummary(
    val balance: String,
    val totalIncome: String,
    val totalExpense: String,
    val records: List<WalletRecord>
)

data class EarningsRecord(
    val channel: String,
    val amount: String,
    val note: String
)

data class EarningsSummary(
    val today: String,
    val month: String,
    val withdrawable: String,
    val details: List<EarningsRecord>
)

class WalletRepository(
    private val api: JianliaoApi
) {
    suspend fun getWalletSummary(): RepositoryResult<WalletSummary> = runCatching {
        val dto = api.getProfileWallet()
        val balance = formatMoney(dto.balance, dto.currency)
        val pendingIncome = formatMoney(dto.pendingIncome, dto.currency)
        networkResult(
            data = WalletSummary(
                balance = balance,
                totalIncome = pendingIncome,
                totalExpense = "\$0.00",
                records = listOf(
                    WalletRecord("钱包余额", balance, "最新余额", formatTime(dto.updatedAt)),
                    WalletRecord("待入账收益", "+$pendingIncome", "待结算", formatTime(dto.updatedAt)),
                    WalletRecord("货币单位", dto.currency, "展示币种", formatTime(dto.updatedAt))
                )
            ),
            message = "钱包总览来自真实接口。"
        )
    }.getOrElse {
        fallbackResult(
            data = WalletSummary(
                balance = "\$1,288.00",
                totalIncome = "\$2,660.00",
                totalExpense = "\$1,372.00",
                records = listOf(
                    WalletRecord("活动奖励入账", "+\$120.00", "已到账", "今天 11:20"),
                    WalletRecord("群推广分成", "+\$68.00", "结算中", "今天 09:00"),
                    WalletRecord("钱包提现", "-\$300.00", "已完成", "昨天 18:40")
                )
            ),
            message = "钱包接口请求失败，已回退到演示账单，保证生产演示可继续。"
        )
    }

    suspend fun getEarningsSummary(): RepositoryResult<EarningsSummary> = runCatching {
        val dto = api.getProfileEarnings()
        val today = formatMoney(dto.today)
        val week = formatMoney(dto.thisWeek)
        val month = formatMoney(dto.thisMonth)
        networkResult(
            data = EarningsSummary(
                today = today,
                month = month,
                withdrawable = week,
                details = listOf(
                    EarningsRecord("今日收益", "+$today", "轻量接口返回今日收益"),
                    EarningsRecord("本周收益", "+$week", "用于替代原待提现区域"),
                    EarningsRecord("本月收益", "+$month", "保持现有收益列表结构")
                )
            ),
            message = "收益数据来自真实接口。"
        )
    }.getOrElse {
        fallbackResult(
            data = EarningsSummary(
                today = "\$188.00",
                month = "\$4,920.00",
                withdrawable = "\$1,066.00",
                details = listOf(
                    EarningsRecord("一级代理推广", "+\$120.00", "新增 6 位实名用户"),
                    EarningsRecord("活动裂变奖励", "+\$48.00", "活动中心拉新任务"),
                    EarningsRecord("群运营分润", "+\$20.00", "群消息活跃度分成")
                )
            ),
            message = "收益接口请求失败，当前展示必要兜底数据。"
        )
    }

    private fun formatMoney(amount: Double, currency: String = "USD"): String {
        val symbol = if (currency.uppercase(Locale.US) == "USD") "$" else "$currency "
        return symbol + String.format(Locale.US, "%,.2f", amount)
    }

    private fun formatTime(value: String): String {
        return value.replace('T', ' ').take(16)
    }
}
