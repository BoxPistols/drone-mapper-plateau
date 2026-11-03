import { useModalA11y } from '../hooks/useModalA11y'
import { CAMERA_LABELS, BUTTON_LABELS } from '../constants/labels'
import { STEPS, type StepDef } from '../constants/steps'

// 各手順で押すボタン名は BUTTON_LABELS から埋め込み、実際の画面と表記をそろえる
const STEP_HOW_TO: Record<StepDef['id'], string> = {
  city:  '「マップ」タブで見たい都市を選びます。最初は台東区が開いています',
  route: `「飛行計画」タブで「${BUTTON_LABELS.newPlan}」を押し、「${BUTTON_LABELS.addWaypointsOnMap}」で地図をクリックして通過ポイントを2つ以上置きます。終わったら「${BUTTON_LABELS.finishPlacing}」`,
  fly:   `計画の「${BUTTON_LABELS.startSimulation}」を押し、飛行前の確認項目にチェックすると飛び始めます`,
}

interface Props {
  onClose: () => void
}

export function HelpModal({ onClose }: Props) {
  const ref = useModalA11y<HTMLDivElement>(onClose)
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={ref}
        className="modal-panel help-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="help-modal-title">DroneMapper の使い方</h2>
          <button className="modal-close" aria-label="閉じる" onClick={onClose}>×</button>
        </div>

        <div className="help-content">

          <section className="help-section help-section--highlight">
            <h3>はじめてのかたへ</h3>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-muted)' }}>
              「マップ」タブの <b>「{BUTTON_LABELS.demoFlight}」</b> を押すと、
              サンプルのルートでドローンが3D都市を飛ぶ様子をすぐに見られます。
            </p>
          </section>

          <section className="help-section">
            <h3>基本の使い方（{STEPS.length}ステップ）</h3>
            <div className="help-steps">
              {STEPS.map((step) => (
                <div className="help-step" key={step.id}>
                  <span className="help-step-num">{step.number}</span>
                  <div>
                    <b>{step.title}</b>
                    <p>{STEP_HOW_TO[step.id]}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="help-section">
            <h3>地図の動かし方</h3>
            <table className="help-table">
              <tbody>
                <tr><td>左ボタンを押しながら動かす</td><td>地図を移動</td></tr>
                <tr><td>右ボタンを押しながら動かす</td><td>視点を回す・傾ける</td></tr>
                <tr><td>スクロール（ホイール）</td><td>ズームイン / アウト</td></tr>
                <tr><td>右下の「平面」「立体」</td><td>真上からの地図と3D表示を切り替え</td></tr>
              </tbody>
            </table>
          </section>

          <section className="help-section">
            <h3>地図上の通過ポイント・目印・エリア</h3>
            <table className="help-table">
              <tbody>
                <tr><td>クリック（またはタップ）／右クリック</td><td>名前・高さなどを変える小窓が開きます。削除もここから</td></tr>
                <tr><td>通過ポイント・目印を<b>ドラッグ</b></td><td>位置を動かせます（高さは地上高のまま）</td></tr>
                <tr><td>建物をクリック</td><td>建物の名前・用途・階数などが表示されます</td></tr>
                <tr><td><kbd>Esc</kbd></td><td>ポイント配置やエリア描画をやめる・小窓を閉じる</td></tr>
              </tbody>
            </table>
          </section>

          <section className="help-section">
            <h3>エリアを描くとき</h3>
            <table className="help-table">
              <tbody>
                <tr><td>クリック</td><td>角を1つ置く</td></tr>
                <tr><td>ダブルクリック</td><td>エリアを確定する（角3つ以上）</td></tr>
                <tr><td>右クリック</td><td>最後に置いた角を取り消す</td></tr>
              </tbody>
            </table>
          </section>

          <section className="help-section">
            <h3>シミュレーション中の操作</h3>
            <table className="help-table">
              <tbody>
                <tr>
                  <td><span className="help-badge">再生 / 一時停止</span>・<kbd>Space</kbd></td>
                  <td>飛行を止める・再開する</td>
                </tr>
                <tr>
                  <td><span className="help-badge">1× 2× 5× 10×</span></td>
                  <td>再生速度を変えられます</td>
                </tr>
                <tr>
                  <td><b>カメラ: {CAMERA_LABELS.free}</b></td>
                  <td>地図を自分で動かして見られます</td>
                </tr>
                <tr>
                  <td><b>カメラ: {CAMERA_LABELS.follow}</b></td>
                  <td>ドローンを後ろから追いかけます</td>
                </tr>
                <tr>
                  <td><b>カメラ: {CAMERA_LABELS.pov}</b></td>
                  <td>ドローンの目線で見られます</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="help-section">
            <h3>データについて</h3>
            <p className="help-note">
              まち・飛行エリア・目印・飛行計画は<b>このブラウザに自動保存</b>されます。
              次回開いたときにも残ります（別のブラウザや別の端末では表示されません）。
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
