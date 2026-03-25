interface Props {
  onClose: () => void
}

export function HelpModal({ onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>DroneMapper の使い方</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="help-content">

          {/* はじめてのかた向け */}
          <section className="help-section help-section--highlight">
            <h3>🚀 はじめてのかたへ</h3>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-muted)' }}>
              左のパネルにある <b>「デモフライトを見る」</b> ボタンを押すだけで、
              ドローンが3D都市を飛ぶ様子をすぐに体験できます！
            </p>
          </section>

          {/* 基本の流れ */}
          <section className="help-section">
            <h3>📋 基本の使い方（4ステップ）</h3>
            <div className="help-steps">
              <div className="help-step">
                <span className="help-step-num">1</span>
                <div>
                  <b>まちを選ぶ</b>
                  <p>「マップ」タブで見たい都市を選びます</p>
                </div>
              </div>
              <div className="help-step">
                <span className="help-step-num">2</span>
                <div>
                  <b>飛行エリアを描く</b>
                  <p>「エリアを描く」ボタンで地図をクリックして囲みます。ダブルクリックで確定</p>
                </div>
              </div>
              <div className="help-step">
                <span className="help-step-num">3</span>
                <div>
                  <b>ルートを作る</b>
                  <p>「飛行計画」タブで計画を作り、「地図で追加」で通過ポイントを置きます</p>
                </div>
              </div>
              <div className="help-step">
                <span className="help-step-num">4</span>
                <div>
                  <b>シミュレーション</b>
                  <p>飛行計画を開いて「飛行シミュレーション」ボタンで開始！</p>
                </div>
              </div>
            </div>
          </section>

          {/* 地図の操作 */}
          <section className="help-section">
            <h3>🗺️ 地図の動かし方</h3>
            <table className="help-table">
              <tbody>
                <tr><td>左ボタンを押しながら動かす</td><td>地図を移動</td></tr>
                <tr><td>右ボタンを押しながら動かす</td><td>視点を回す・傾ける</td></tr>
                <tr><td>スクロール（ホイール）</td><td>ズームイン / アウト</td></tr>
              </tbody>
            </table>
          </section>

          {/* シミュレーション */}
          <section className="help-section">
            <h3>✈️ シミュレーション中の操作</h3>
            <table className="help-table">
              <tbody>
                <tr>
                  <td><span className="help-badge">▶ 再生</span></td>
                  <td>飛行を開始 / 一時停止</td>
                </tr>
                <tr>
                  <td><span className="help-badge">1× 2× 5× 10×</span></td>
                  <td>再生速度を変えられます</td>
                </tr>
                <tr>
                  <td><b>カメラ: 自由</b></td>
                  <td>地図を自分で動かして見られます</td>
                </tr>
                <tr>
                  <td><b>カメラ: 追いかける</b></td>
                  <td>ドローンを後ろから追いかけます</td>
                </tr>
                <tr>
                  <td><b>カメラ: ドローン視点</b></td>
                  <td>ドローンの目線で見られます</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* マップ上での操作 */}
          <section className="help-section">
            <h3>👆 地図上でのクリック操作</h3>
            <table className="help-table">
              <tbody>
                <tr><td>飛行エリアや目印をクリック</td><td>名前・設定を変更できます</td></tr>
                <tr><td>右クリック</td><td>削除の確認画面が出ます</td></tr>
                <tr>
                  <td>建物をクリック</td>
                  <td>建物の名前・用途・階数などが表示されます</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* データ保存 */}
          <section className="help-section">
            <h3>💾 データについて</h3>
            <p className="help-note">
              設定したエリア・ルート・記録はすべて<b>このブラウザに自動保存</b>されます。
              次回開いたときにも消えずに残ります。
              （別のブラウザや別のパソコンでは表示されません）
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
