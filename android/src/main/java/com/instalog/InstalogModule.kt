package com.instalog

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import dev.instalog.mobile.*
import dev.instalog.mobile.Instalog
import dev.instalog.mobile.models.InstalogLogModel
import dev.instalog.mobile.ui.InstalogAlertData

class InstalogModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext), InstalogAlertDialogHandler {
  private val instalog = Instalog.getInstance()

  // Example method
  // See https://reactnative.dev/docs/native-modules-android
  @ReactMethod
  fun initialize(apiKey: String, options: ReadableMap, promise: Promise) {

    if (currentActivity == null) {
      promise.reject("ACTIVITY_NULL", "Current activity is null")
      return
    }

    val opt = InstalogOptions(
      isLogEnabled = if (options.hasKey("isLogEnabled")) options.getBoolean("isLogEnabled") else false,
      isLoggerEnabled = if (options.hasKey("isLoggerEnabled")) options.getBoolean("isLoggerEnabled") else false,
      isCrashEnabled = if (options.hasKey("isCrashEnabled")) options.getBoolean("isCrashEnabled") else false,
      isFeedbackEnabled = if (options.hasKey("isFeedbackEnabled")) options.getBoolean("isFeedbackEnabled") else false,
    )

    try {
      instalog.initialize(
        key = apiKey,
        context = currentActivity!!.applicationContext,
        handler = this,
        options = opt
      )
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("INITIALIZE_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun log(event: String, params: ReadableMap, promise: Promise) {
    if (currentActivity == null) {
      promise.reject("ACTIVITY_NULL", "Current activity is null")
      return
    }

    try {
      val hashMap = params.toHashMap()
      val paramsMap: HashMap<String, String> = hashMap.mapValues { it.value?.toString() ?: "" } as HashMap<String, String>

      val log = InstalogLogModel(
        event = event,
        params = paramsMap
      )

      instalog.logEvent(currentActivity!!.applicationContext, log)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("LOG_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun identifyUser(id: String, promise: Promise) {
    try {
      instalog.identifyUser(id)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("IDENTIFY_USER_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun sendCrash(error: String, stack: String, promise: Promise) {
    if (currentActivity == null) {
      promise.reject("ACTIVITY_NULL", "Current activity is null")
      return
    }

    try {
      instalog.sendCrash(currentActivity!!.applicationContext, error, stack)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("SEND_CRASH_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun showFeedbackModal(promise: Promise) {

    if (currentActivity == null) {
      promise.reject("ACTIVITY_NULL", "Current activity is null")
      return
    }

    try {
      instalog.showFeedbackModal(currentActivity!!)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("FEEDBACK_MODAL_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun simulateCrash(promise: Promise) {
    try {
      Instalog.crash.simulateExceptionCrash()
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("SIMULATE_CRASH_ERROR", e.message, e)
    }
  }

  companion object {
    const val NAME = "InstalogRN"
  }

  override fun show(data: InstalogAlertData) {
  }

  override fun getName(): String {
    return NAME
  }
}
