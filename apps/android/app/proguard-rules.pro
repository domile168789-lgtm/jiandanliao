# Add project specific ProGuard rules here.
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Keep models used by Moshi reflection.
-keepclassmembers class ** {
    @com.squareup.moshi.Json <fields>;
}

