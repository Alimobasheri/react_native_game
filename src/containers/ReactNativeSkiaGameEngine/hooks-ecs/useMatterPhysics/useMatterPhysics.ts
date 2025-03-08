import { Engine, World } from "matter-js"
import { useRef } from "react"

export const useMatterPhysics = () => {
  const engine = useRef(Engine.create())

  const addBody = (body: Matter.Body) => {
    World.add(engine.current.world, body)
  }
}