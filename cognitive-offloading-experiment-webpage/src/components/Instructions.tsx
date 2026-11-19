import { Btn, Card } from "./ui";

export default function Instructions({ onBegin }: { onBegin: () => void }) {
  return (
    <Card>
      <h1 className="text-xl font-semibold text-navy">Instructions</h1>
      <div className="mt-4 space-y-3 text-[15px]">
        <p>You will complete two short writing tasks. Each task will have its own instructions and topic.</p>
        <p>
          Before writing, you will have the option to view a help guide containing important points related to the
          topic.
        </p>
        <p>Using the guide is completely optional. You may write your response independently.</p>
        <p>Please read each task carefully and complete it to the best of your ability.</p>
      </div>
      <div className="mt-6 border-t border-line pt-5 text-sm text-muted">
        <p>
          Please stay on this page while you work. Your browser may ask permission to use full-screen mode, which is
          recommended but not required. Please do not refresh the page or use the browser's back button during the
          activity.
        </p>
      </div>
      <div className="mt-6">
        <Btn className="w-full sm:w-auto" onClick={onBegin}>
          Begin
        </Btn>
      </div>
    </Card>
  );
}
