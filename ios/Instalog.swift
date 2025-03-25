import InstalogIOS

@objc(InstalogRN)
class InstalogRN: NSObject {
  
  @objc(initialize:options:withResolver:withRejecter:)
  func initialize(
    apiKey: String,
    options: [String: Any]?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let instalogOptions = InstalogOptions(dictionary: options)
    Instalog.shared.initialize(key: apiKey, options: instalogOptions)
    resolve(nil)
  }
  
  @objc(log:params:withResolver:withRejecter:)
  func log(
    event: String,
    params: [String: String]?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let log = InstalogLogModel(
      event: event,
      params: params ?? [:]
    )
    Instalog.shared.logEvent(log: log)
    resolve(nil)
  }
  
  @objc(identifyUser:withResolver:withRejecter:)
  func identifyUser(
    userId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Instalog.shared.identifyUser(userId)
    resolve(nil)
  }
  
  @objc(simulateCrash:withRejecter:)
  func simulateCrash(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Instalog.crash.simulateCrash()
    resolve(nil)
  }
  
  @objc(sendCrash:report:withResolver:withRejecter:)
  func sendCrash(
    name: String?,
    report: String?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Instalog.shared.sendCrash(
      name: name,
      report: report,
      completion:  { sent in
        resolve(sent);
      }
    )
  }
  
  @objc(showFeedbackModal:withRejecter:)
  func showFeedbackModal(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Instalog.shared.showFeedbackModal()
    resolve(nil)
  }
}
